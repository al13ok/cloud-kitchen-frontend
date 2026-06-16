import React, { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '@/utils/api';
import { 
  TrendingUp, 
  Users, 
  Target, 
  AlertTriangle, 
  BarChart3,
  MapPin,
  Clock,
  CheckCircle
} from 'lucide-react';

interface AgentAnalysis {
  agent_id: string;
  agent_name: string;
  total_leads: number;
  converted_leads: number;
  conversion_rate: number;
  avg_response_time: string;
  success_rate: number;
  current_workload: number;
  max_capacity: number;
}

interface PipelineTrend {
  date: string;
  leads_captured: number;
  leads_enriched: number;
  leads_scored: number;
  leads_contacted: number;
  leads_qualified: number;
  proposals_sent: number;
  negotiations: number;
  closed_won: number;
  closed_lost: number;
}

interface FunnelData {
  stage: string;
  leads_count: number;
  conversion_rate: number;
  drop_off_rate: number;
  avg_duration: string;
}

interface DropOffData {
  stage: string;
  drop_off_count: number;
  drop_off_rate: number;
  reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

interface IPAnalytics {
  ip_address: string;
  location: string;
  leads_count: number;
  conversion_rate: number;
  avg_score: number;
  top_sources: string[];
}

interface LeadAnalyticsProps {
  leadId: string;
  agentId?: string;
}

const LeadAnalytics: React.FC<LeadAnalyticsProps> = ({ leadId, agentId }) => {
  const [agentAnalysis, setAgentAnalysis] = useState<AgentAnalysis | null>(null);
  const [pipelineTrends, setPipelineTrends] = useState<PipelineTrend[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [dropOffData, setDropOffData] = useState<DropOffData[]>([]);
  const [ipAnalytics, setIpAnalytics] = useState<IPAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch agent analysis
  const fetchAgentAnalysis = useCallback(async () => {
    if (!agentId) return;
    try {
      const response = await fetch(`/api/v1/leads-integration/agent/${agentId}/analysis`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setAgentAnalysis(data);
      }
    } catch (err) {
      console.error('Error fetching agent analysis:', err);
    }
  }, [agentId]);

  // Fetch pipeline trends
  const fetchPipelineTrends = async () => {
    try {
      console.log('Fetching pipeline trends...');
      const response = await fetch('/api/v1/leads-integration/pipeline/trends', {
        headers: getAuthHeaders()
      });
      console.log('Pipeline trends response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Pipeline trends data:', data);
        
        // Handle different response structures
        if (data.trends && Array.isArray(data.trends)) {
          setPipelineTrends(data.trends);
        } else if (Array.isArray(data)) {
          setPipelineTrends(data);
        } else {
          console.log('No pipeline trends data available');
          setPipelineTrends([]);
        }
      } else {
        console.error('Pipeline trends API error:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error fetching pipeline trends:', err);
    }
  };

  // Fetch funnel analytics
  const fetchFunnelAnalytics = async () => {
    try {
      console.log('Fetching funnel analytics...');
      const response = await fetch('/api/v1/leads-integration/analytics/funnel', {
        headers: getAuthHeaders()
      });
      console.log('Funnel analytics response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Funnel analytics data:', data);
        
        // Handle different response structures
        if (data.funnel_stages && Array.isArray(data.funnel_stages)) {
          setFunnelData(data.funnel_stages);
        } else if (Array.isArray(data)) {
          setFunnelData(data);
        } else {
          console.log('No funnel analytics data available');
          setFunnelData([]);
        }
      } else {
        console.error('Funnel analytics API error:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error fetching funnel analytics:', err);
    }
  };

  // Fetch drop-off analysis
  const fetchDropOffAnalysis = async () => {
    try {
      console.log('Fetching drop-off analysis...');
      const response = await fetch('/api/v1/leads-integration/analytics/drop-offs', {
        headers: getAuthHeaders()
      });
      console.log('Drop-off analysis response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Drop-off analysis data:', data);
        
        // Handle different response structures
        if (data.drop_offs && Array.isArray(data.drop_offs)) {
          setDropOffData(data.drop_offs);
        } else if (Array.isArray(data)) {
          setDropOffData(data);
        } else {
          console.log('No drop-off analysis data available');
          setDropOffData([]);
        }
      } else {
        console.error('Drop-off analysis API error:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error fetching drop-off analysis:', err);
    }
  };

  // Fetch IP analytics
  const fetchIPAnalytics = async () => {
    try {
      console.log('Fetching IP analytics...');
      const response = await fetch('/api/v1/leads-integration/analytics/ip', {
        headers: getAuthHeaders()
      });
      console.log('IP analytics response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('IP analytics data:', data);
        
        // Handle different response structures
        if (data.ip_data && Array.isArray(data.ip_data)) {
          setIpAnalytics(data.ip_data);
        } else if (Array.isArray(data)) {
          setIpAnalytics(data);
        } else {
          console.log('No IP analytics data available');
          setIpAnalytics([]);
        }
      } else {
        console.error('IP analytics API error:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error fetching IP analytics:', err);
    }
  };

  useEffect(() => {
    const fetchAllAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          fetchAgentAnalysis(),
          fetchPipelineTrends(),
          fetchFunnelAnalytics(),
          fetchDropOffAnalysis(),
          fetchIPAnalytics()
        ]);
        
        const failedAnalytics = results.filter(result => result.status === 'rejected');
        if (failedAnalytics.length > 0) {
          console.log('Some analytics failed to load:', failedAnalytics);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAllAnalytics();
  }, [leadId, agentId, fetchAgentAnalysis]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  // Check if we have any analytics data
  const hasAnalyticsData = agentAnalysis || 
    pipelineTrends.length > 0 || 
    funnelData.length > 0 || 
    dropOffData.length > 0 || 
    ipAnalytics.length > 0;

  if (!hasAnalyticsData && !error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Analytics Data</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Analytics data will appear here once the lead progresses through the pipeline.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span>Error loading analytics: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Analysis */}
      {agentAnalysis && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Agent Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Leads</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{agentAnalysis.total_leads}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Conversion Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{agentAnalysis.conversion_rate}%</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Avg Response Time</span>
              </div>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{agentAnalysis.avg_response_time}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Success Rate</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{agentAnalysis.success_rate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Trends */}
      {pipelineTrends.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Pipeline Trends
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400">Date</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">Captured</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">Enriched</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">Scored</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">Contacted</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">Qualified</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">Proposals</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">Won</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">Lost</th>
                </tr>
              </thead>
              <tbody>
                {pipelineTrends.slice(0, 10).map((trend, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 text-gray-900 dark:text-white">{new Date(trend.date).toLocaleDateString()}</td>
                    <td className="text-right py-2 text-gray-600 dark:text-gray-400">{trend.leads_captured}</td>
                    <td className="text-right py-2 text-gray-600 dark:text-gray-400">{trend.leads_enriched}</td>
                    <td className="text-right py-2 text-gray-600 dark:text-gray-400">{trend.leads_scored}</td>
                    <td className="text-right py-2 text-gray-600 dark:text-gray-400">{trend.leads_contacted}</td>
                    <td className="text-right py-2 text-gray-600 dark:text-gray-400">{trend.leads_qualified}</td>
                    <td className="text-right py-2 text-gray-600 dark:text-gray-400">{trend.proposals_sent}</td>
                    <td className="text-right py-2 text-green-600 dark:text-green-400">{trend.closed_won}</td>
                    <td className="text-right py-2 text-red-600 dark:text-red-400">{trend.closed_lost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Funnel Analytics */}
      {funnelData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Funnel Analytics
          </h3>
          <div className="space-y-3">
            {funnelData.map((stage, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{stage.stage}</p>
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
      )}

      {/* Drop-off Analysis */}
      {dropOffData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Drop-off Analysis
          </h3>
          <div className="space-y-4">
            {dropOffData.map((stage, index) => (
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
      )}

      {/* IP Analytics */}
      {ipAnalytics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            IP Analytics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ipAnalytics.slice(0, 6).map((ip, index) => (
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
      )}
    </div>
  );
};

export default LeadAnalytics;
