'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw,
  BarChart3,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import Select from '@/components/form/Select';
import Input from '@/components/form/input/InputField';
import { 
  getSLASummaryReport,
  getHelpdeskCategories,
  type SLAReportSummary
} from '@/services/servicedeskSlaService';
import { 
  getSLAMetrics,
  getSLABreaches,
  getEscalatedTickets,
  type SLAMetrics as SLAMetricsNew,
  type SLABreach,
  type EscalatedTicket 
} from '@/services/slaService';
import DashboardHeader from '@/components/header/DashboardHeader';

export default function SLAReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New SLA Management API State
  const [slaMetrics, setSLAMetrics] = useState<SLAMetricsNew | null>(null);
  const [breachesData, setBreachesData] = useState<SLABreach[]>([]);
  const [escalatedTickets, setEscalatedTickets] = useState<EscalatedTicket[]>([]);
  const [escalatedCurrentPage, setEscalatedCurrentPage] = useState(1);
  const escalatedItemsPerPage = 10;

  // Old state (keeping for backward compatibility)
  const [summaryData, setSummaryData] = useState<SLAReportSummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false); // Track client-side hydration
  
  // Filters - initialize with empty strings to avoid hydration mismatch
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const trendDays = 30;

  // Track when component is mounted (client-side only) to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Initialize dates with default values (last 30 days) only on client side
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    // Only fetch categories after mount to avoid hydration mismatch
    if (mounted) {
      fetchCategories();
    }
  }, [mounted]);

  const fetchCategories = async () => {
    try {
      console.log('🔄 [SLA Reports] Fetching categories...');
      const fetchedCategories = await getHelpdeskCategories();
      console.log('✅ [SLA Reports] Categories fetched:', fetchedCategories);
      console.log('📊 [SLA Reports] Categories count:', fetchedCategories?.length || 0);
      setCategories(fetchedCategories);
    } catch (err) {
      console.error('❌ [SLA Reports] Error fetching categories:', err);
      // Fallback to default categories if API fails
      const defaultCategories = ['Technical Support', 'Billing', 'General', 'System Critical'];
      console.log('⚠️ [SLA Reports] Using default categories:', defaultCategories);
      setCategories(defaultCategories);
    } finally {
      console.log('🏁 [SLA Reports] Category fetch completed');
    }
  };

  // Create stable options array that's consistent between server and client
  // This prevents hydration mismatch by ensuring the same structure on initial render
  const categoryOptions = useMemo(() => {
    const baseOptions = [{ value: 'all', label: 'All Categories' }];
    // Only add categories after mount to avoid hydration mismatch
    if (mounted && categories.length > 0) {
      return [
        ...baseOptions,
        ...categories.map(cat => ({ value: cat, label: cat }))
      ];
    }
    // Return consistent structure on server and before categories load
    return baseOptions;
  }, [mounted, categories]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 [SLA Reports] Starting to fetch reports from NEW SLA Management API...');
      console.log('📅 [SLA Reports] Filters:', {
        startDate,
        endDate,
        priorityFilter,
        categoryFilter,
        trendDays
      });

      // Fetch from NEW SLA Management API endpoints using service functions
      const priorityParam = priorityFilter !== 'all' ? priorityFilter : undefined;
      const categoryParam = categoryFilter !== 'all' ? categoryFilter : undefined;

      // Debug: Log date values before API call
      console.log('🔍 [Debug] Date values before API call:', {
        startDate,
        endDate,
        startDateType: typeof startDate,
        endDateType: typeof endDate
      });

      const [metricsData, breachesDataFetch, escalatedData, summary] = await Promise.all([
        // Use new SLA Management API service functions from slaService
        getSLAMetrics(startDate || undefined, endDate || undefined, priorityParam).catch(err => {
          console.error('❌ Error fetching metrics:', err);
          return null;
        }),
        getSLABreaches(startDate || undefined, endDate || undefined, priorityParam).catch(err => {
          console.error('❌ Error fetching breaches:', err);
          return [];
        }),
        getEscalatedTickets(undefined, undefined, undefined, priorityParam).catch(err => {
          console.error('❌ Error fetching ESCALATED tickets:', err);
          console.error('❌ Escalated tickets error details:', err.message, err.stack);
          return [];
        }),
        // Also fetch old data for backward compatibility
        getSLASummaryReport(
          startDate || undefined,
          endDate || undefined,
          priorityParam,
          categoryParam
        ).catch(err => {
          console.error('❌ Error fetching summary:', err);
          return null;
        })
      ]);

      console.log('✅ [SLA Reports] Metrics data received:', metricsData);
      console.log('✅ [SLA Reports] Metrics data fields:', Object.keys(metricsData || {}));
      console.log('✅ [SLA Reports] Breaches received:', breachesDataFetch?.length || 0);
      console.log('✅ [SLA Reports] Escalated tickets RAW DATA:', escalatedData);
      console.log('✅ [SLA Reports] Escalated tickets TYPE:', typeof escalatedData);
      console.log('✅ [SLA Reports] Escalated tickets IS ARRAY:', Array.isArray(escalatedData));
      console.log('✅ [SLA Reports] Escalated tickets received:', escalatedData?.length || 0);
      console.log('✅ [SLA Reports] Escalated data sample:', escalatedData?.[0]);

      // Now metricsData has the correct structure from slaService
      setSLAMetrics(metricsData);
      setBreachesData(breachesDataFetch || []);
      setSummaryData(summary);
      setEscalatedTickets(escalatedData || []);

      console.log('✅ [SLA Reports] All reports fetched successfully');
      console.log('🎯 [SLA Reports] State updated - escalatedTickets count:', escalatedData?.length || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch SLA reports';
      console.error('❌ [SLA Reports] Error fetching reports:', err);
      console.error('❌ [SLA Reports] Error details:', {
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('🏁 [SLA Reports] Fetch completed');
    }
  }, [startDate, endDate, priorityFilter, categoryFilter, trendDays]);

  useEffect(() => {
    // Only fetch reports if dates are set and component is mounted
    // Wait a bit after mount to ensure dates are initialized
    if (!mounted) {
      console.log('⏸️ [SLA Reports] Waiting for component to mount...');
      return;
    }
    
    if (startDate && endDate) {
      console.log('🔄 [SLA Reports] useEffect triggered - fetching reports');
      console.log('📅 [SLA Reports] Date values:', { startDate, endDate });
      fetchReports();
    } else {
      console.log('⏸️ [SLA Reports] useEffect triggered but dates not ready:', { startDate, endDate });
    }
  }, [startDate, endDate, mounted, fetchReports]);

  const formatTime = (minutes: number) => {
    // Handle invalid values
    if (!minutes || isNaN(minutes) || minutes === 0) return '0m';
    
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950/50 transition-colors duration-500">
      <div className="w-full flex flex-col items-center p-2 sm:p-4 md:p-6 gap-6">
        
        {/* Page Header */}
        <div className="w-full max-w-screen-xl">
          <DashboardHeader
            title="SLA Reports & Analytics"
            subtitle="Comprehensive SLA performance metrics and compliance tracking"
            icon={BarChart3}
            iconColor="text-white"
            variant="default"
            size="lg"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Service Desk', href: '/servicedesk/servicedesk-dashboard' },
              { label: 'SLA Reports & Analytics' }
            ]}
            actions={
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchReports}
                disabled={loading}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </motion.button>
            }
          />
        </div>

        {/* Filters */}
        <div className="w-full max-w-screen-xl">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex gap-4 flex-1">
                  <div className="flex-1 flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white flex-1"
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white flex-1"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select
                    options={[
                      { value: 'all', label: 'All Priority' },
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' }
                    ]}
                    defaultValue={priorityFilter}
                    onChange={(value) => {
                      console.log('🔄 [SLA Reports] Priority filter changed:', value);
                      setPriorityFilter(value);
                    }}
                    placeholder="Priority"
                    className="w-40 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                  <Select
                    options={categoryOptions}
                    defaultValue={categoryFilter}
                    onChange={(value) => {
                      console.log('🔄 [SLA Reports] Category filter changed:', value);
                      setCategoryFilter(value);
                    }}
                    placeholder="Category"
                    className="w-40 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-screen-xl mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="w-full max-w-screen-xl flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600 dark:text-gray-400" />
          </div>
        )}

        {/* Summary Cards - Using NEW SLA Management API Data */}
        {!loading && (slaMetrics || summaryData) && (
          <>
            <div className="w-full max-w-screen-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Tickets</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {slaMetrics?.total_tickets ?? summaryData?.total_tickets ?? 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Compliance Rate</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {slaMetrics 
                            ? `${Math.min(slaMetrics.compliance_rate, 100).toFixed(1)}%`
                            : `${Math.min(summaryData?.sla_compliance.compliance_rate || 0, 100).toFixed(1)}%`
                          }
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Breached</p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                          {slaMetrics?.breached_sla ?? summaryData?.sla_compliance.breached ?? 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Avg Response</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {slaMetrics 
                            ? formatTime(slaMetrics.avg_response_time)
                            : formatTime(summaryData?.average_times.first_response_minutes ?? 0)
                          }
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Compliance Breakdown - Using NEW SLA Management API Data */}
            <div className="w-full max-w-screen-xl grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SLA Compliance Breakdown</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">Met SLA</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {slaMetrics?.met_sla ?? summaryData?.sla_compliance.met ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="text-gray-700 dark:text-gray-300">Breached</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {slaMetrics?.breached_sla ?? summaryData?.sla_compliance.breached ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <span className="text-gray-700 dark:text-gray-300">At Risk</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {slaMetrics?.at_risk ?? summaryData?.sla_compliance.at_risk ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-700 dark:text-gray-300">Pending</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {slaMetrics?.pending ?? summaryData?.sla_compliance.pending ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Average Times</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">First Response</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {slaMetrics 
                            ? formatTime(slaMetrics.avg_response_time)
                            : formatTime(summaryData?.average_times.first_response_minutes ?? 0)
                          }
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, slaMetrics 
                              ? (slaMetrics.avg_response_time / 240) * 100 
                              : ((summaryData?.average_times.first_response_minutes ?? 0) / 240) * 100
                            )}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Resolution</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {slaMetrics 
                            ? formatTime(slaMetrics.avg_resolution_time)
                            : formatTime(summaryData?.average_times.resolution_minutes ?? 0)
                          }
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, slaMetrics 
                              ? (slaMetrics.avg_resolution_time / 1440) * 100
                              : ((summaryData?.average_times.resolution_minutes ?? 0) / 1440) * 100
                            )}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Breached Tickets - Using NEW SLA Management API Data */}
            {breachesData.length > 0 && (
              <Card className="w-full max-w-screen-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recently Breached Tickets</h3>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                      {breachesData.length} Breaches
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ticket #</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Breach Type</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Breach Duration</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Breached At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breachesData.slice(0, 10).map((breach, index) => (
                          <tr key={breach._id || `breach-${index}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                              {breach.ticket_id}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                breach.breach_type === 'resolution' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              }`}>
                                {breach.breach_type === 'resolution' ? 'Resolution Time' : 'Response Time'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                breach.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                breach.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                breach.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}>
                                {breach.priority || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                              {formatTime(breach.breach_amount_minutes || 0)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                              {breach.breach_time ? formatDate(breach.breach_time) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Escalated Tickets Table */}
            {console.log('🔍 [SLA Reports] Render check - loading:', loading, 'escalatedTickets.length:', escalatedTickets.length)}
            {escalatedTickets.length > 0 && (() => {
              const totalPages = Math.ceil(escalatedTickets.length / escalatedItemsPerPage);
              const startIndex = (escalatedCurrentPage - 1) * escalatedItemsPerPage;
              const endIndex = startIndex + escalatedItemsPerPage;
              const paginatedTickets = escalatedTickets.slice(startIndex, endIndex);
              
              return (
              <Card className="w-full max-w-screen-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Escalated Tickets</h3>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                      {escalatedTickets.length} Total Escalated
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ticket #</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Issue</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Escalation Level</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Escalated To</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Escalated At</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Breaches</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTickets.map((ticket) => (
                          <tr key={ticket.ticket_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                              {ticket.ticket_number || ticket.ticket_id}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                              {ticket.issue || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ticket.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                ticket.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}>
                                {ticket.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ticket.escalation_level === 'level_4' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                ticket.escalation_level === 'level_3' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                ticket.escalation_level === 'level_2' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              }`}>
                                {ticket.escalation_level === 'level_4' ? '⚡ Level 4 - CTO' :
                                 ticket.escalation_level === 'level_3' ? '🎯 Level 3 - Director' :
                                 ticket.escalation_level === 'level_2' ? '👔 Level 2 - Manager' :
                                 '👤 Level 1 - Team Lead'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                              {ticket.escalated_to || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                              {ticket.escalated_at ? formatDate(ticket.escalated_at) : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                                {ticket.breaches?.length || 0}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {startIndex + 1} to {Math.min(endIndex, escalatedTickets.length)} of {escalatedTickets.length} escalated tickets
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEscalatedCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={escalatedCurrentPage === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setEscalatedCurrentPage(page)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                escalatedCurrentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => setEscalatedCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={escalatedCurrentPage === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

