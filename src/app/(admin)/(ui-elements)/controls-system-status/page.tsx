"use client";
import React, { useEffect, useState, useMemo } from "react";
import { 
  ServerIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/solid";
import { 
  Activity,
  Bell,
  Monitor,
  RefreshCw,
  Shield,
  Users
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DashboardHeader from '@/components/header/DashboardHeader';

 

 

 

 

 

 

 


 

 

 

 

 

 

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

 

 

type Service = {
  name: string;
  status: ServiceStatus;
  message: string;
  uptime?: number;
  responseTime?: number;
  lastChecked?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  dependencies?: string[];
  healthScore?: number;
};


type Incident = {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  affectedServices: string[];
  assignedTo?: string;
};


 

type Activity = {
  type: string;
  created_at: string;
  // session_history
  title?: string;
  domain?: string;
  history_count?: number;
  // lead
  name?: string;
  source?: string;
  interest?: string;
  // job_applicant
  job_category?: string;
  status?: string;
  // ticket
  ticket_type?: string;
  subject?: string;
};


 

const ALL_SERVICES = [
  { 
    name: "Authentication API", 
    category: "Security",
    priority: "high" as const,
    icon: Shield,
    color: "blue",
    description: "Handles user authentication and authorization"
  },
  { 
    name: "Dashboard UI", 
    category: "Frontend",
    priority: "high" as const,
    icon: Monitor,
    color: "green",
    description: "Main user interface and dashboard components"
  },
  { 
    name: "Notifications", 
    category: "Communication",
    priority: "medium" as const,
    icon: Bell,
    color: "yellow",
    description: "Real-time notifications and alerts"
  },
  { 
    name: "User Management", 
    category: "Administration",
    priority: "high" as const,
    icon: Users,
    color: "indigo",
    description: "User accounts and permission management"
  },
];

const STATUS_LABELS: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded: "Degraded Performance",
  outage: "Major Outage",
  maintenance: "Under Maintenance",
};

const STATUS_BG: Record<ServiceStatus, string> = {
  operational: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
  degraded: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700",
  outage: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
  maintenance: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700",
};

export default function SystemStatusPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  
  // New enhanced state variables
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [autoRefresh] = useState(true);
  const [refreshInterval] = useState(30); // seconds

  // Auth: get the live authenticated user
  const { } = useAuth();

  // Helper functions
  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'degraded': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'outage': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      case 'maintenance': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };


  // Computed values

  const systemHealth = useMemo(() => {
    if (services.length === 0) return { score: 0, status: 'unknown' };
    
    const operationalCount = services.filter(s => s.status === 'operational').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const outageCount = services.filter(s => s.status === 'outage').length;
    
    const score = Math.round((operationalCount / services.length) * 100);
    
    if (outageCount > 0) return { score, status: 'critical' };
    if (degradedCount > 0) return { score, status: 'warning' };
    return { score, status: 'healthy' };
  }, [services]);

  const recentIncidents = useMemo(() => {
    return incidents.filter(incident => 
      incident.status === 'open' || incident.status === 'investigating'
    ).slice(0, 5);
  }, [incidents]);

  // Generate mock data for enhanced features
  useEffect(() => {
    // Mock incidents
    setIncidents([
      {
        id: 'INC-001',
        title: 'Database Connection Timeout',
        description: 'Intermittent connection timeouts to the primary database',
        severity: 'high',
        status: 'investigating',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        affectedServices: ['Authentication API', 'User Management'],
        assignedTo: 'DevOps Team'
      },
      {
        id: 'INC-002',
        title: 'File Upload Service Degradation',
        description: 'File uploads are experiencing slower than normal processing times',
        severity: 'medium',
        status: 'open',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        affectedServices: ['File Storage'],
        assignedTo: 'Backend Team'
      }
    ]);
  }, []);

  // Get current user information
  useEffect(() => {
    // Try to get user from localStorage or sessionStorage
    const getUserInfo = () => {
      try {
        // Check localStorage first
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          // This effect is now redundant as currentUser is derived from useAuth
          // setCurrentUser(JSON.parse(storedUser));
          return;
        }

        // Check sessionStorage
        const sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
          // This effect is now redundant as currentUser is derived from useAuth
          // setCurrentUser(JSON.parse(sessionUser));
          return;
        }

        // If no stored user, set default user based on the header
        // This matches the user shown in the header: "sachin sharma"
        // This effect is now redundant as currentUser is derived from useAuth
        // setCurrentUser({
        //   name: "sachin sharma",
        //   email: "sachin.sharma@Mobiloittegroup.com",
        //   role: "Admin"
        // });
      } catch (error) {
        console.log('Error getting user info:', error);
        // Set default user as fallback
        // This effect is now redundant as currentUser is derived from useAuth
        // setCurrentUser({
        //   name: "sachin sharma",
        //   email: "sachin.sharma@Mobiloittegroup.com",
        //   role: "Admin"
        // });
      }
    };

    getUserInfo();
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/system-status/system-status`);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        setServices(data);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
          setError((err as { message: string }).message);
        } else {
          setError("Failed to fetch system status");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleString());
  }, [services]);



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Professional Header */}
      <div className="px-6 py-8">
        <DashboardHeader
          variant="default"
          size="lg"
          title="System Status"
          subtitle="Real-time monitoring and system health dashboard"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'System Status', href: '/controls-system-status' }
          ]}
          icon={() => (
            <div className="relative">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
            </div>
          )}
        />
      </div>
      
      {/* Main Content */}
      <div className="px-6 py-8">
          
          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
                  </div>
            
            {/* Filters */}
                        <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
              <FunnelIcon className="w-4 h-4" />
              Filters
                        </button>
            
            {/* Refresh */}
                                    <button
              onClick={() => window.location.reload()}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
              <RefreshCw className="w-4 h-4" />
                                    </button>
                            </div>
          </div>
        
        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="operational">Operational</option>
                  <option value="degraded">Degraded</option>
                  <option value="outage">Outage</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                          </div>
              
                          <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Filter
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Categories</option>
                  <option value="Security">Security</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Finance">Finance</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Communication">Communication</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>
              
              <div className="flex items-end">
                            <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Clear Filters
                            </button>
              </div>
            </div>
          </div>
        )}

        {/* System Content */}
        <div className="space-y-6">
          {/* System Health Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">System Health Overview</h3>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  systemHealth.status === 'healthy' ? 'bg-green-500' :
                  systemHealth.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {systemHealth.status === 'healthy' ? 'All Systems Healthy' :
                   systemHealth.status === 'warning' ? 'Minor Issues Detected' : 'Critical Issues Detected'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {systemHealth.score}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Overall Health Score</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {services.filter(s => s.status === 'operational').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Operational Services</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {recentIncidents.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Incidents</div>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8 text-gray-700 dark:text-gray-300">Loading system status...</div>
            ) : error ? (
              <div className="text-center text-red-600 dark:text-red-400 py-8">{error}</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {ALL_SERVICES.map((serviceConfig) => {
                  const apiService = services.find((s) => s.name === serviceConfig.name);
                  const serviceStatus = apiService?.status || 'operational';
                  const Icon = serviceConfig.icon || ServerIcon;
                  
                  return (
                    <div
                      key={serviceConfig.name}
                      className={`p-6 rounded-xl border transition-all hover:shadow-lg ${STATUS_BG[serviceStatus]}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            serviceConfig.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' :
                            serviceConfig.color === 'green' ? 'bg-green-100 dark:bg-green-900/20' :
                            serviceConfig.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/20' :
                            serviceConfig.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/20' :
                            serviceConfig.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                            'bg-indigo-100 dark:bg-indigo-900/20'
                          }`}>
                            <Icon className={`w-6 h-6 ${
                              serviceConfig.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                              serviceConfig.color === 'green' ? 'text-green-600 dark:text-green-400' :
                              serviceConfig.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                              serviceConfig.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                              serviceConfig.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-indigo-600 dark:text-indigo-400'
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{serviceConfig.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{serviceConfig.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(serviceStatus)}`}>
                            {STATUS_LABELS[serviceStatus]}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(serviceConfig.priority)}`}>
                            {serviceConfig.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {apiService?.message || 'Service is operational'}
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Category: {serviceConfig.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                              <Cog6ToothIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      
      {/* Footer */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>Last updated: {lastUpdated}</div>
          <div className="flex items-center gap-4">
            <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
            <span>Interval: {refreshInterval}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
