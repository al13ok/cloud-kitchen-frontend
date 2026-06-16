import React, { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '@/utils/api';
import { 
  AlertTriangle, 
  BarChart3,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface DebugDashboardProps {
  days?: number;
  startDate?: string;
  endDate?: string;
}

interface ApiResult {
  name: string;
  endpoint: string;
  status: number;
  statusText: string;
  ok: boolean;
  data: unknown;
  error: string | null;
}

const DebugDashboard: React.FC<DebugDashboardProps> = ({ 
  days = 30, 
  startDate, 
  endDate 
}) => {
  const [apiResults, setApiResults] = useState<Record<string, ApiResult>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAPIEndpoint = async (endpoint: string, name: string) => {
    try {
      console.log(`Testing ${name}: ${endpoint}`);
      const response = await fetch(endpoint, {
        headers: getAuthHeaders()
      });
      
      const result: ApiResult = {
        name,
        endpoint,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: null,
        error: null
      };

      if (response.ok) {
        try {
          const data = await response.json();
          result.data = data;
          console.log(`${name} success:`, data);
        } catch (parseError) {
          result.error = 'Failed to parse JSON response';
          console.error(`${name} JSON parse error:`, parseError);
        }
      } else {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
        console.error(`${name} failed:`, response.status, response.statusText);
      }

      return result;
    } catch (err: unknown) {
      const result: ApiResult = {
        name,
        endpoint,
        status: 0,
        statusText: 'Network Error',
        ok: false,
        data: null,
        error: err instanceof Error ? err.message : String(err)
      };
      console.error(`${name} network error:`, err);
      return result;
    }
  };

  const testAllEndpoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApiResults({});

    const endpoints = [
      {
        url: `/api/v1/leads-integration/dashboard/kpis?days=${days}`,
        name: 'KPI Cards'
      },
      {
        url: '/api/v1/leads-integration/dashboard/pipeline-overview',
        name: 'Pipeline Overview'
      },
      {
        url: startDate && endDate 
          ? `/api/v1/leads-integration/analytics/funnel?start_date=${startDate}&end_date=${endDate}`
          : `/api/v1/leads-integration/analytics/funnel?days=${days}`,
        name: 'Conversion Funnel'
      },
      {
        url: `/api/v1/leads-integration/analytics/drop-offs?days=${days}`,
        name: 'Drop-off Analysis'
      },
      {
        url: `/api/v1/leads-integration/analytics/ip?days=${days}`,
        name: 'IP Analytics'
      },
      {
        url: `/api/v1/leads-integration/analytics/conversion-rates?days=${days}`,
        name: 'Conversion Rates'
      }
    ];

    try {
      const results = await Promise.allSettled(
        endpoints.map(endpoint => testAPIEndpoint(endpoint.url, endpoint.name))
      );

      const apiResults: Record<string, ApiResult> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          apiResults[endpoints[index].name] = result.value;
        } else {
          apiResults[endpoints[index].name] = {
            name: endpoints[index].name,
            endpoint: endpoints[index].url,
            status: 0,
            statusText: 'Promise Rejected',
            ok: false,
            data: null,
            error: result.reason?.message || 'Unknown error'
          };
        }
      });

      setApiResults(apiResults);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [days, startDate, endDate]);

  useEffect(() => {
    testAllEndpoints();
  }, [days, startDate, endDate, testAllEndpoints]);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
    if (status >= 400 && status < 500) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400';
    if (status >= 500) return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
    return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4" />;
    if (status >= 400) return <AlertTriangle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Dashboard API Debug
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Testing all dashboard API endpoints to identify issues
            </p>
          </div>
          <button
            onClick={testAllEndpoints}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Testing...' : 'Test All APIs'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span>Error: {error}</span>
            </div>
          </div>
        )}
      </div>

      {/* API Results */}
      <div className="space-y-4">
        {Object.entries(apiResults).map(([name, result]: [string, ApiResult]) => (
          <div key={name} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{name}</h4>
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(result.status)}`}>
                {getStatusIcon(result.status)}
                {result.status} {result.statusText}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint:</p>
                <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{result.endpoint}</code>
              </div>

              {result.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Error:</strong> {result.error}
                  </p>
                </div>
              )}

              {(() => {
                if (!result.data) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Response Data:</p>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                        {(() => {
                          try {
                            return String(JSON.stringify(result.data, null, 2));
                          } catch {
                            return String(result.data);
                          }
                        })()}
                      </pre>
                    </div>
                  </div>
                );
              })()}

              {result.status === 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Network Error:</strong> Unable to reach the API endpoint. Check if the backend server is running.
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">Successful</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {Object.values(apiResults).filter((result: ApiResult) => result.status >= 200 && result.status < 300).length}
            </p>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800 dark:text-yellow-200">Client Errors</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {Object.values(apiResults).filter((result: ApiResult) => result.status >= 400 && result.status < 500).length}
            </p>
          </div>
          
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800 dark:text-red-200">Server Errors</span>
            </div>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100">
              {Object.values(apiResults).filter((result: ApiResult) => result.status >= 500).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugDashboard;
