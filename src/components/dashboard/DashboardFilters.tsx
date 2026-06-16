"use client";

import React, { useState } from 'react';
import { 
  Filter, 
  Calendar, 
  Users, 
  MapPin, 
  Target, 
  X,
  ChevronDown,
  Search,
  RefreshCw
} from 'lucide-react';

interface FilterOptions {
  stages: string[];
  agents: Array<{ id: string; name: string; }>;
  regions: string[];
  dateRanges: Array<{ label: string; value: string; }>;
}

interface DashboardFiltersProps {
  onFiltersChange: (filters: DashboardFilters) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export interface DashboardFilters {
  stage?: string;
  agent?: string;
  region?: string;
  dateRange?: string;
  customStartDate?: string;
  customEndDate?: string;
  searchQuery?: string;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  onFiltersChange,
  onRefresh,
  loading = false
}) => {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock data - in real app, this would come from API
  const filterOptions: FilterOptions = {
    stages: [
      'Lead Captured',
      'Lead Enriched', 
      'Lead Scored',
      'Contacted',
      'Qualified',
      'Proposal Sent',
      'Negotiation',
      'Closed Won',
      'Closed Lost'
    ],
    agents: [
      { id: '1', name: 'John Smith' },
      { id: '2', name: 'Sarah Johnson' },
      { id: '3', name: 'Mike Wilson' },
      { id: '4', name: 'Emily Davis' }
    ],
    regions: [
      'North America',
      'Europe',
      'Asia Pacific',
      'Latin America',
      'Middle East & Africa'
    ],
    dateRanges: [
      { label: 'Last 7 days', value: '7d' },
      { label: 'Last 30 days', value: '30d' },
      { label: 'Last 90 days', value: '90d' },
      { label: 'This year', value: '1y' },
      { label: 'Custom range', value: 'custom' }
    ]
  };

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    
    if (key === 'dateRange' && value === 'custom') {
      setShowCustomDate(true);
    } else if (key === 'dateRange' && value !== 'custom') {
      setShowCustomDate(false);
      delete newFilters.customStartDate;
      delete newFilters.customEndDate;
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    setShowCustomDate(false);
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value !== '');

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value !== '').length;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Dashboard Filters</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {hasActiveFilters 
                ? `${getActiveFiltersCount()} filter${getActiveFiltersCount() > 1 ? 's' : ''} applied`
                : 'No filters applied'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {filters.stage && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900 dark:text-blue-200">
                <Target className="w-3 h-3" />
                Stage: {filters.stage}
                <button
                  onClick={() => handleFilterChange('stage', '')}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.agent && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-900 dark:text-green-200">
                <Users className="w-3 h-3" />
                Agent: {filterOptions.agents.find(a => a.id === filters.agent)?.name}
                <button
                  onClick={() => handleFilterChange('agent', '')}
                  className="ml-1 hover:text-green-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.region && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full dark:bg-purple-900 dark:text-purple-200">
                <MapPin className="w-3 h-3" />
                Region: {filters.region}
                <button
                  onClick={() => handleFilterChange('region', '')}
                  className="ml-1 hover:text-purple-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.dateRange && filters.dateRange !== 'custom' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full dark:bg-orange-900 dark:text-orange-200">
                <Calendar className="w-3 h-3" />
                Date: {filterOptions.dateRanges.find(d => d.value === filters.dateRange)?.label}
                <button
                  onClick={() => handleFilterChange('dateRange', '')}
                  className="ml-1 hover:text-orange-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.customStartDate && filters.customEndDate && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full dark:bg-orange-900 dark:text-orange-200">
                <Calendar className="w-3 h-3" />
                Custom: {filters.customStartDate} to {filters.customEndDate}
                <button
                  onClick={() => {
                    handleFilterChange('customStartDate', '');
                    handleFilterChange('customEndDate', '');
                    handleFilterChange('dateRange', '');
                  }}
                  className="ml-1 hover:text-orange-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          
          <button
            onClick={clearFilters}
            className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Filter Controls */}
      {isExpanded && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stage Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Target className="w-4 h-4 inline mr-1" />
                Stage
              </label>
              <select
                value={filters.stage || ''}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All stages</option>
                {filterOptions.stages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            {/* Agent Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Agent
              </label>
              <select
                value={filters.agent || ''}
                onChange={(e) => handleFilterChange('agent', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All agents</option>
                {filterOptions.agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Region
              </label>
              <select
                value={filters.region || ''}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All regions</option>
                {filterOptions.regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date Range
              </label>
              <select
                value={filters.dateRange || ''}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All time</option>
                {filterOptions.dateRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          {showCustomDate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.customStartDate || ''}
                  onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.customEndDate || ''}
                  onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Search Query */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search Query
            </label>
            <input
              type="text"
              value={filters.searchQuery || ''}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              placeholder="Search leads, companies, or keywords..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;
