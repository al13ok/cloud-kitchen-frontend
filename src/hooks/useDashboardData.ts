import { useState, useEffect, useCallback } from 'react';

interface DashboardData {
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  pendingLeads: number;
  averageScore: number;
  conversionRate: number;
  totalRevenue?: number;
  revenueGrowth?: number;
  avgResponseTime?: string;
  activeAgents?: number;
  leadsPerAgent?: number;
}

interface PipelineData {
  stage: string;
  count: number;
  value?: number;
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface FunnelData {
  stage: string;
  leads: number;
  conversion_rate?: number;
  drop_off_rate?: number;
  avg_duration?: string;
}

interface DropOffData {
  stage: string;
  drop_off_count?: number;
  drop_off_rate?: number;
  reasons?: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

interface IPAnalytics {
  ip_address: string;
  count: number;
  location?: string;
  leads_count?: number;
  conversion_rate?: number;
  avg_score?: number;
  top_sources?: string[];
}

interface TrendData {
  date: string;
  value: number;
  stage?: string;
}

interface ScoreData {
  score_range: string;
  count: number;
  avg_score: number;
}

interface SourceScoreData {
  source: string;
  [key: string]: string | { count: number; avg_score: number };
}

interface UseDashboardDataReturn {
  // Data
  metrics: DashboardData;
  pipelineData: PipelineData[];
  funnelData: FunnelData[];
  dropOffData: DropOffData[];
  ipAnalytics: IPAnalytics[];
  pipelineTrends: TrendData[];
  scoreData: ScoreData[];
  sourceScoreData: SourceScoreData[];

  // Loading states
  loading: boolean;
  metricsLoading: boolean;
  chartsLoading: boolean;

  // Error states
  error: string | null;
  metricsError: string | null;
  chartsError: string | null;

  // Actions
  refetch: () => void;
  refetchMetrics: () => void;
  refetchCharts: () => void;
}

// API Configuration - Use environment variables
const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://py-mobiloitte.converiqo.ai";
console.log('🔧 API_BASE using:', API_BASE);

export const useDashboardData = (): UseDashboardDataReturn => {
  console.log('🎯 useDashboardData hook initialized');

  // Data states
  const [metrics, setMetrics] = useState<DashboardData>({
    totalLeads: 0,
    newLeads: 0,
    convertedLeads: 0,
    pendingLeads: 0,
    averageScore: 0,
    conversionRate: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    avgResponseTime: 'N/A',
    activeAgents: 0,
    leadsPerAgent: 0,
  });

  const [pipelineData, setPipelineData] = useState<PipelineData[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [dropOffData, setDropOffData] = useState<DropOffData[]>([]);
  const [ipAnalytics, setIpAnalytics] = useState<IPAnalytics[]>([]);
  const [pipelineTrends, setPipelineTrends] = useState<TrendData[]>([]);
  const [scoreData, setScoreData] = useState<ScoreData[]>([]);
  const [sourceScoreData, setSourceScoreData] = useState<SourceScoreData[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [chartsError, setChartsError] = useState<string | null>(null);

  // Fetch metrics data
  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      setMetricsError(null);

      const url = `${API_BASE}/api/v1/leads-integration/dashboard/kpis`;
      console.log('🔗 Calling KPIs API:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Dashboard KPIs API Response:', data);

      const metricsData = {
        totalLeads: data.total_leads || 0,
        newLeads: data.new_leads || 0,
        convertedLeads: data.converted || data.converted_leads || 0,
        pendingLeads: data.pending || data.pending_leads || 0,
        averageScore: data.avg_score || 0,
        conversionRate: data.conversion_rate || 0,
        totalRevenue: data.total_revenue || 0,
        revenueGrowth: data.revenue_growth || 0,
        avgResponseTime: data.avg_response_time || 'N/A',
        activeAgents: data.active_agents || 0,
        leadsPerAgent: data.leads_per_agent || 0,
      };
      console.log('📊 Setting metrics state:', metricsData);
      setMetrics(metricsData);
      console.log('📊 Metrics state set successfully');
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setMetricsError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Fetch charts data
  const fetchCharts = useCallback(async () => {
    try {
      setChartsLoading(true);
      setChartsError(null);

      // Fetch all chart data in parallel
      const urls = [
        `${API_BASE}/api/v1/leads-integration/dashboard/pipeline`,
        `${API_BASE}/api/v1/leads-integration/dashboard/funnel`,
        `${API_BASE}/api/v1/leads-integration/dashboard/drop-off`,
        `${API_BASE}/api/v1/leads-integration/dashboard/ip-analytics`,
        `${API_BASE}/api/v1/leads-integration/dashboard/trends`,
        `${API_BASE}/api/v1/leads-integration/dashboard/leads-by-score`,
        `${API_BASE}/api/v1/leads-integration/dashboard/leads-by-source-score`,
      ];
      console.log('🔗 Calling Charts APIs:', urls);

      const [pipelineResponse, funnelResponse, dropOffResponse, ipResponse, trendsResponse, scoreResponse, sourceScoreResponse] = await Promise.all([
        fetch(urls[0]),
        fetch(urls[1]),
        fetch(urls[2]),
        fetch(urls[3]),
        fetch(urls[4]),
        fetch(urls[5]),
        fetch(urls[6]),
      ]);

      // Process pipeline data
      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json();
        console.log('📈 Pipeline API Response:', pipelineData);
        setPipelineData(pipelineData || []);
        console.log('📈 Pipeline data set successfully');
      }

      // Process funnel data
      if (funnelResponse.ok) {
        const funnelData = await funnelResponse.json();
        console.log('🔄 Funnel API Response:', funnelData);
        console.log('🔄 Funnel data structure:', funnelData.map((item: FunnelData) => ({ stage: item.stage, leads: item.leads })));
        setFunnelData(funnelData || []);
        console.log('🔄 Funnel data set successfully');
      } else {
        console.error('🔄 Funnel API failed:', funnelResponse.status, funnelResponse.statusText);
      }

      // Process drop-off data
      if (dropOffResponse.ok) {
        const dropOffData = await dropOffResponse.json();
        console.log('📉 Drop-off API Response:', dropOffData);
        setDropOffData(dropOffData || []);
      }

      // Process IP analytics
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        console.log('🌐 IP Analytics API Response:', ipData);
        setIpAnalytics(ipData || []);
      }

      // Process trends data
      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json();
        console.log('📊 Trends API Response:', trendsData);
        setPipelineTrends(trendsData || []);
      }

      // Process score data
      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json();
        console.log('📊 Score API Response:', scoreData);
        setScoreData(scoreData || []);
      }

      // Process source-score data
      if (sourceScoreResponse.ok) {
        const sourceScoreData = await sourceScoreResponse.json();
        console.log('📊 Source-Score API Response:', sourceScoreData);
        setSourceScoreData(sourceScoreData || []);
      }
    } catch (err) {
      console.error('Error fetching charts:', err);
      setChartsError(err instanceof Error ? err.message : 'Failed to fetch charts data');
    } finally {
      setChartsLoading(false);
    }
  }, []);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    console.log('🎯 fetchAllData called');
    try {
      setLoading(true);
      setError(null);

      console.log('🎯 Calling fetchMetrics and fetchCharts in parallel');
      await Promise.all([
        fetchMetrics(),
        fetchCharts(),
      ]);
      console.log('🎯 fetchAllData completed successfully');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics, fetchCharts]);

  // Refetch functions
  const refetch = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refetchMetrics = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const refetchCharts = useCallback(() => {
    fetchCharts();
  }, [fetchCharts]);

  // Initial data fetch
  useEffect(() => {
    console.log('🎯 useDashboardData useEffect triggered - calling fetchAllData');
    fetchAllData();
  }, [fetchAllData]);

  return {
    // Data
    metrics,
    pipelineData,
    funnelData,
    dropOffData,
    ipAnalytics,
    pipelineTrends,
    scoreData,
    sourceScoreData,

    // Loading states
    loading,
    metricsLoading,
    chartsLoading,

    // Error states
    error,
    metricsError,
    chartsError,

    // Actions
    refetch,
    refetchMetrics,
    refetchCharts,
  };
};
