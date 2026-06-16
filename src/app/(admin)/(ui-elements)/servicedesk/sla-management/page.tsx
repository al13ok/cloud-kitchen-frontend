'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw,
  BarChart3,
  Download,
  Loader2,
  Settings,
  TrendingUp
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import DashboardHeader from '@/components/header/DashboardHeader';
import SLAMetricsCards from '@/components/servicedesk/SLAMetricsCards';
import AtRiskTicketsPanel from '@/components/servicedesk/AtRiskTicketsPanel';
import EscalatedTicketsPanel from '@/components/servicedesk/EscalatedTicketsPanel';
import SLAPolicyManager from '@/components/servicedesk/SLAPolicyManager';
import Select from '@/components/form/Select';
import Input from '@/components/form/input/InputField';
import {
  getSLAMetrics,
  getAtRiskTickets,
  getSLABreaches,
  getSLATrends,
  exportSLAReport,
  downloadReport,
  getEscalatedTickets,
  type SLAMetrics,
  type AtRiskTicket,
  type SLABreach,
  type SLATrend,
  type EscalatedTicket
} from '@/services/slaService';

export default function SLAManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Data states
  const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
  const [atRiskTickets, setAtRiskTickets] = useState<AtRiskTicket[]>([]);
  const [breaches, setBreaches] = useState<SLABreach[]>([]);
  const [trends, setTrends] = useState<SLATrend[]>([]);
  const [escalatedTickets, setEscalatedTickets] = useState<EscalatedTicket[]>([]);
  
  // UI states
  const [showPolicyManager, setShowPolicyManager] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Initialize dates
  useEffect(() => {
    setMounted(true);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 [SLA Management] Fetching data...');

      const priority = priorityFilter !== 'all' ? priorityFilter : undefined;

      const [metricsData, atRiskData, breachesData, trendsData, escalatedData] = await Promise.all([
        getSLAMetrics(startDate, endDate, priority),
        getAtRiskTickets(50),
        getSLABreaches(startDate, endDate, priority, 100),
        getSLATrends(30),
        getEscalatedTickets(startDate, endDate, undefined, priority)
      ]);

      setMetrics(metricsData);
      setAtRiskTickets(atRiskData);
      setBreaches(breachesData);
      setTrends(trendsData);
      setEscalatedTickets(escalatedData);

      console.log('✅ [SLA Management] Data fetched successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch SLA data';
      console.error('❌ [SLA Management] Error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, priorityFilter]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (!mounted || !startDate || !endDate) return;
    
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 60000); // Refresh every 60 seconds
      return () => clearInterval(interval);
    }
  }, [mounted, startDate, endDate, priorityFilter, autoRefresh, fetchData]);

  // Export report
  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      setExporting(true);
      const priority = priorityFilter !== 'all' ? priorityFilter : undefined;
      const blob = await exportSLAReport(format, startDate, endDate, priority);
      
      const filename = `sla-report-${startDate}-to-${endDate}.${format}`;
      downloadReport(blob, filename);
      
      console.log('✅ [SLA Management] Report exported:', filename);
    } catch (err) {
      console.error('❌ [SLA Management] Export error:', err);
      setError('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950/50 transition-colors duration-500">
      <div className="w-full flex flex-col items-center p-2 sm:p-4 md:p-6 gap-6">
        
        {/* Page Header */}
        <div className="w-full max-w-screen-2xl">
          <DashboardHeader
            title="Enterprise SLA Management"
            subtitle="Real-time monitoring, auto-escalation, and comprehensive analytics"
            icon={BarChart3}
            iconColor="text-white"
            variant="default"
            size="lg"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Service Desk', href: '/servicedesk/servicedesk-dashboard' },
              { label: 'SLA Management' }
            ]}
            actions={
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPolicyManager(!showPolicyManager)}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 border border-white/30"
                >
                  <Settings className="w-5 h-5" />
                  {showPolicyManager ? 'Hide' : 'Policies'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchData}
                  disabled={loading}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </motion.button>
              </div>
            }
          />
        </div>

        {/* Filters and Controls */}
        <div className="w-full max-w-screen-2xl">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex gap-4 flex-1">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Priority
                    </label>
                    <Select
                      options={[
                        { value: 'all', label: 'All Priority' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'urgent', label: 'Urgent' }
                      ]}
                      defaultValue={priorityFilter}
                      onChange={setPriorityFilter}
                      placeholder="Priority"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      id="auto-refresh"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="auto-refresh" className="text-sm text-gray-700 dark:text-gray-300">
                      Auto-refresh
                    </label>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleExport('pdf')}
                      disabled={exporting || loading}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      disabled={exporting || loading}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      disabled={exporting || loading}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-screen-2xl">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {/* Policy Manager */}
        {showPolicyManager && (
          <div className="w-full max-w-screen-2xl">
            <SLAPolicyManager onPolicyChange={fetchData} />
          </div>
        )}

        {/* Loading State */}
        {loading && !metrics && (
          <div className="w-full max-w-screen-2xl flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600 dark:text-gray-400" />
          </div>
        )}

        {/* Main Content */}
        {!loading && metrics && (
          <>
            {/* Metrics Cards */}
            <div className="w-full max-w-screen-2xl">
              <SLAMetricsCards metrics={metrics} loading={loading} />
            </div>

            {/* Escalated Tickets Summary Card */}
            {escalatedTickets.length > 0 && (
              <div className="w-full max-w-screen-2xl">
                <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {escalatedTickets.length}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Tickets Escalated
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Currently requiring attention
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Escalated Tickets and At-Risk Tickets */}
            <div className="w-full max-w-screen-2xl grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Escalated Tickets Panel */}
              <EscalatedTicketsPanel 
                tickets={escalatedTickets} 
                loading={loading}
              />

              {/* At-Risk Tickets Panel */}
              <AtRiskTicketsPanel 
                tickets={atRiskTickets} 
                loading={loading}
              />

              {/* Trends Chart */}
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Trends</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  {trends.length > 0 ? (
                    <div className="space-y-2">
                      {trends.slice(0, 10).map((trend, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {trend.total_tickets} tickets
                            </span>
                            <span className={`text-sm font-bold ${
                              trend.compliance_rate >= 95 ? 'text-green-600' :
                              trend.compliance_rate >= 85 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {trend.compliance_rate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No trend data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Breaches */}
            {breaches.length > 0 && (
              <Card className="w-full max-w-screen-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent SLA Breaches</h3>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ticket ID</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Breach Time</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Escalation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breaches.slice(0, 20).map((breach, index) => (
                          <tr key={breach._id || index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                            <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">
                              #{breach.ticket_id}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                              {breach.breach_type}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(breach.priority)}`}>
                                {breach.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                              {formatDate(breach.breach_time)}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-red-600 dark:text-red-400">
                              {Math.round(breach.breach_amount_minutes)}m
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                Level {breach.escalation_level}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
