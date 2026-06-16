'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Users, 
  Eye, 
  MousePointer, 
  MessageSquare, 
  FileText, 
  Clock, 
  TrendingUp,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Zap,
  Target,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  User,
  ChevronDown,
  ChevronRight,
  Download
} from 'lucide-react';

export interface SessionData {
  leadId: string;
  leadName: string;
  leadEmail: string;
  hasSessionData: boolean;
  session?: {
    sessionId: string;
    startTime: string;
    lastActivity: string;
    totalTimeOnSite: number;
    currentPage: string;
    interactions: number | Array<{ [key: string]: unknown }>;
    chatbotInteractions: number;
    formSubmitted: boolean;
    satisfaction: 'good' | 'bad';
    userAgent: string;
    screenResolution: string;
    deviceType: string;
    language: string;
    timezone: string;
    referrer: string;
    website: string;
    pageViews?: number | Array<{
      url: string;
      title: string;
      pageName?: string;
      timestamp: string;
      timeSpent: number;
      scrollDepth: number;
      exitPage: boolean;
    }>;
    page_views?: Array<{
      url: string;
      title: string;
      pageName?: string;
      timestamp: string;
      timeSpent: number;
      scrollDepth: number;
      exitPage: boolean;
    }>;
    form_interactions?: Array<Record<string, unknown>>;
    chatbot_events?: Array<Record<string, unknown>>;
    custom_events?: Array<Record<string, unknown>>;
  };
  sessionData?: {
    sessionId: string;
    startTime: string;
    lastActivity: string;
    totalTimeOnSite: number;
    currentPage: string;
    interactionCount: number;
    chatbotInteractions: number;
    formSubmitted: boolean;
    satisfaction: 'good' | 'bad';
    userAgent: string;
    screenResolution: string;
    deviceType: string;
    language: string;
    timezone: string;
    referrer: string;
    website: string;
    pageViews: Array<{
      url: string;
      title: string;
      pageName?: string;
      timestamp: string;
      timeSpent: number;
      scrollDepth: number;
      exitPage: boolean;
      chatbotPresent: boolean;
    }>;
    page_views?: Array<{
      url: string;
      title: string;
      pageName?: string;
      timestamp: string;
      timeSpent: number;
      scrollDepth: number;
      exitPage: boolean;
    }>;
    interactions: Array<{
      type: string;
      element: string | null | Record<string, unknown>;
      timestamp: string;
      page: string;
      data: { [key: string]: unknown };
    }> | number;
    form_interactions?: Array<Record<string, unknown>>;
    chatbot_events?: Array<Record<string, unknown>>;
    custom_events?: Array<Record<string, unknown>>;
  };
  pageViews?: number | Array<{
    url: string;
    title: string;
    pageName?: string;
    timestamp: string;
    timeSpent: number;
    scrollDepth: number;
    exitPage: boolean;
  }>;
  sessionInsights: { [key: string]: unknown };
  sessionScore: number;
  timestamp: string;
}

interface ComprehensiveSessionAnalysisProps {
  sessionData: SessionData | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
}

const ComprehensiveSessionAnalysis: React.FC<ComprehensiveSessionAnalysisProps> = ({
  sessionData,
  loading = false,
  error = null,
  onRefresh,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'pageViews', 'interactions']));
  const [selectedInteractionType, setSelectedInteractionType] = useState<string>('all');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return <Smartphone className="h-4 w-4" />;
    if (userAgent.includes('Tablet')) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'click': return <MousePointer className="h-4 w-4 text-blue-600" />;
      case 'scroll': return <Activity className="h-4 w-4 text-green-600" />;
      case 'form_focus': return <Target className="h-4 w-4 text-purple-600" />;
      case 'form_submission': return <FileText className="h-4 w-4 text-orange-600" />;
      case 'bot_initialized': return <MessageSquare className="h-4 w-4 text-indigo-600" />;
      case 'user_message': return <User className="h-4 w-4 text-pink-600" />;
      case 'external_link': return <ExternalLink className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case 'click': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scroll': return 'bg-green-100 text-green-800 border-green-200';
      case 'form_focus': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'form_submission': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'bot_initialized': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'user_message': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'external_link': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSatisfactionColor = (satisfaction: 'good' | 'bad') => {
    return satisfaction === 'good' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getSatisfactionIcon = (satisfaction: 'good' | 'bad') => {
    return satisfaction === 'good' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
  };

  // Helper function to get session data from either 'session' or 'sessionData' property
  const getSessionData = () => sessionData?.session || sessionData?.sessionData;
  
  // Helper function to get page views from multiple possible locations
  const getPageViews = () => {
    const session = getSessionData();
    // Try to get as array first
    if (Array.isArray(session?.pageViews)) return session.pageViews;
    const sessionWithPageViews = session as unknown as { page_views?: unknown[] };
    if (Array.isArray(sessionWithPageViews?.page_views)) return sessionWithPageViews.page_views;
    if (Array.isArray(sessionData?.pageViews)) return sessionData.pageViews;
    // Fallback to number or 0
    if (session?.pageViews !== undefined) return session.pageViews;
    if (sessionData?.pageViews !== undefined) return sessionData.pageViews;
    return [];
  };
  
  // Get interactions data - handle both array and integer cases
  const interactions = Array.isArray(getSessionData()?.interactions) ? getSessionData()!.interactions : [];
  
  // Get form interactions from dedicated array
  interface SessionDataWithArrays {
    form_interactions?: Array<{ [key: string]: unknown }>;
    chatbot_events?: Array<{ [key: string]: unknown }>;
    custom_events?: Array<{ [key: string]: unknown }>;
  }
  const sessionDataWithArrays = getSessionData() as SessionDataWithArrays;
  const formInteractions = Array.isArray(sessionDataWithArrays?.form_interactions) ? sessionDataWithArrays.form_interactions : [];
  
  // Get chatbot events from dedicated array
  const chatbotEvents = Array.isArray(sessionDataWithArrays?.chatbot_events) ? sessionDataWithArrays.chatbot_events : [];
  
  // Get custom events from dedicated array
  const customEvents = Array.isArray(sessionDataWithArrays?.custom_events) ? sessionDataWithArrays.custom_events : [];

  // Early return if no session data
  // Check if sessionData exists and has the required properties
  if (!sessionData || (!sessionData.session && !sessionData.sessionData && !sessionData.hasSessionData)) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Session Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400">Session analytics data is not available for this lead.</p>
        </div>
      </div>
    );
  }

  // Filter interactions by type - handle both array and integer cases
  const filteredInteractions = Array.isArray(interactions) 
    ? interactions.filter(interaction => {
        if (selectedInteractionType === 'all') return true;
        return interaction.type === selectedInteractionType;
      })
    : (typeof interactions === 'number' ? [] : []);

  // Get unique interaction types - handle both array and integer cases
  const interactionTypes = Array.isArray(interactions) 
    ? interactions.reduce((acc, interaction) => {
        const interactionType = interaction.type;
        if (interactionType && typeof interactionType === 'string' && !acc.includes(interactionType)) {
          acc.push(interactionType);
        }
        return acc;
      }, [] as string[])
    : (typeof interactions === 'number' ? ['general'] : []);

  // Get external links - handle both array and integer cases
  const externalLinks = Array.isArray(interactions) 
    ? interactions.filter(interaction => {
        const data = interaction.data as { url?: string } | undefined;
        return interaction.type === 'external_link' && data?.url;
      })
    : (typeof interactions === 'number' ? [] : []);

  // Get form submissions - combine from dedicated array and interactions
  const formSubmissions = [
    ...formInteractions.filter((fi: { action?: string; type?: string }) => fi.action === 'submit' || fi.type === 'form_submission'),
    ...(Array.isArray(interactions) ? interactions.filter(interaction => 
        interaction.type === 'form_submission' && interaction.data
      ) : [])
  ];

  // Get chatbot interactions - combine from dedicated array and interactions
  const chatbotInteractions = [
    ...chatbotEvents,
    ...(Array.isArray(interactions) ? interactions.filter(interaction => {
        const interactionType = interaction.type;
        return interactionType && typeof interactionType === 'string' && ['bot_initialized', 'user_message'].includes(interactionType);
      }) : [])
  ];

  // Get scroll events with depth - handle both array and integer cases
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scrollEvents = Array.isArray(interactions) 
    ? interactions.filter(interaction => {
        const data = interaction.data as { scrollDepth?: number } | undefined;
        return interaction.type === 'scroll' && data?.scrollDepth !== undefined;
      })
    : (typeof interactions === 'number' ? [] : []);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading comprehensive session analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 dark:text-red-200 font-medium">Error loading session data</p>
          </div>
          <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!sessionData || !sessionData.hasSessionData) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Session Data</h3>
          <p className="text-gray-600 dark:text-gray-400">No session data available for this lead.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Comprehensive Session Analysis
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete user behavior tracking and analytics
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Lead Information */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Lead ID</p>
              <p className="font-mono text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                {sessionData.leadId}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
              <p className="font-semibold text-gray-900 dark:text-white">{sessionData.leadName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-sm text-gray-900 dark:text-white">{sessionData.leadEmail}</p>
            </div>
          </div>
        </div>

        {/* Session Overview */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session Overview</h3>
            </div>
            {expandedSections.has('overview') ? 
              <ChevronDown className="h-5 w-5 text-gray-600" /> : 
              <ChevronRight className="h-5 w-5 text-gray-600" />
            }
          </button>
          
          <AnimatePresence>
            {expandedSections.has('overview') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Session Duration</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {(() => {
                          const session = getSessionData();
                          let duration = session?.totalTimeOnSite || 0;
                          
                          // If totalTimeOnSite is 0 or missing, calculate from start and end times
                          if (!duration || duration === 0) {
                            if (session?.startTime && session?.lastActivity) {
                              const start = new Date(session.startTime);
                              const end = new Date(session.lastActivity);
                              if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                                duration = Math.floor((end.getTime() - start.getTime()) / 1000); // Convert to seconds
                              }
                            }
                            // If still 0, try end_time
                            if (!duration && session?.startTime && (session as SessionData['session'] & { end_time?: string })?.end_time) {
                              const start = new Date(session.startTime);
                              const end = new Date((session as SessionData['session'] & { end_time: string }).end_time);
                              if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                                duration = Math.floor((end.getTime() - start.getTime()) / 1000);
                              }
                            }
                            // Try combining active_time and idle_time if available
                            interface SessionWithTimeFields {
                              active_time?: number;
                              idle_time?: number;
                            }
                            const sessionWithTime = session as SessionData['session'] & SessionWithTimeFields;
                            if (!duration && sessionWithTime?.active_time && sessionWithTime?.idle_time) {
                              const activeTime = typeof sessionWithTime.active_time === 'number' 
                                ? (sessionWithTime.active_time >= 1000 ? sessionWithTime.active_time / 1000 : sessionWithTime.active_time)
                                : 0;
                              const idleTime = typeof sessionWithTime.idle_time === 'number'
                                ? (sessionWithTime.idle_time >= 1000 ? sessionWithTime.idle_time / 1000 : sessionWithTime.idle_time)
                                : 0;
                              duration = Math.floor(activeTime + idleTime);
                            }
                          }
                          
                          // If duration is in seconds (less than 360000), use as is; otherwise assume it's in milliseconds
                          if (duration > 360000) {
                            duration = Math.floor(duration / 1000);
                          }
                          
                          return duration > 0 ? formatDuration(duration) : '0s';
                        })()}
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MousePointer className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Interactions</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {Array.isArray(interactions) 
                          ? interactions.length 
                          : (typeof interactions === 'number' ? interactions : 0)}
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Page Views</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {(() => {
                          const pageViews = getPageViews();
                          return Array.isArray(pageViews) ? pageViews.length : (typeof pageViews === 'number' ? pageViews : 0);
                        })()}
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getSessionData()?.satisfaction ? getSatisfactionIcon(getSessionData()!.satisfaction) : <AlertCircle className="h-4 w-4 text-gray-400" />}
                        <span className="text-sm text-gray-600 dark:text-gray-400">Satisfaction</span>
                      </div>
                      <p className={`text-lg font-semibold ${getSessionData()?.satisfaction ? getSatisfactionColor(getSessionData()!.satisfaction) : 'text-gray-600 bg-gray-100'} px-2 py-1 rounded`}>
                        {getSessionData()?.satisfaction || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Time on Page</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {(() => {
                          const session = getSessionData();
                          const timeOnPage = (session as SessionData['session'] & { time_on_page?: number })?.time_on_page;
                          if (timeOnPage) {
                            return timeOnPage >= 1000 ? formatDuration(timeOnPage) : `${Math.round(timeOnPage)}ms`;
                          }
                          // Calculate from page views
                          const pageViews = getPageViews();
                          if (Array.isArray(pageViews) && pageViews.length > 0) {
                            const lastPage = pageViews[pageViews.length - 1] as { timeSpent?: number; time_spent?: number };
                            const timeSpent = lastPage.timeSpent || lastPage.time_spent || 0;
                            return timeSpent > 0 ? formatDuration(timeSpent) : '0s';
                          }
                          return '0s';
                        })()}
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Active Time</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {(() => {
                          const session = getSessionData();
                          interface SessionWithActiveTime {
                            active_time?: number;
                          }
                          const activeTime = (session as SessionWithActiveTime)?.active_time;
                          if (activeTime) {
                            return activeTime >= 1000 ? formatDuration(activeTime) : `${Math.round(activeTime)}ms`;
                          }
                          // Estimate from total time
                          const totalTime = session?.totalTimeOnSite || 0;
                          return totalTime > 0 ? formatDuration(Math.floor(totalTime * 0.8 * 1000)) : '0s';
                        })()}
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Idle Time</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {(() => {
                          const session = getSessionData();
                          interface SessionWithIdleTime {
                            idle_time?: number;
                          }
                          const idleTime = (session as SessionWithIdleTime)?.idle_time;
                          if (idleTime) {
                            return idleTime >= 1000 ? formatDuration(idleTime) : `${Math.round(idleTime)}ms`;
                          }
                          // Estimate from total time
                          const totalTime = session?.totalTimeOnSite || 0;
                          return totalTime > 0 ? formatDuration(Math.floor(totalTime * 0.2 * 1000)) : '0s';
                        })()}
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Scroll Depth</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {(() => {
                          const session = getSessionData();
                          interface SessionWithScrollDepth {
                            scroll_depth?: number;
                          }
                          const scrollDepth = (session as SessionWithScrollDepth)?.scroll_depth;
                          if (scrollDepth !== undefined && scrollDepth !== null) {
                            return `${scrollDepth}%`;
                          }
                          // Get from page views
                          const pageViews = getPageViews();
                          if (Array.isArray(pageViews) && pageViews.length > 0) {
                            const lastPage = pageViews[pageViews.length - 1] as { scrollDepth?: number; scroll_depth?: number };
                            return `${lastPage.scrollDepth || lastPage.scroll_depth || 0}%`;
                          }
                          return '0%';
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getSessionData()?.userAgent ? getDeviceIcon(getSessionData()!.userAgent) : <Monitor className="h-4 w-4 text-gray-400" />}
                        <span className="text-sm text-gray-600 dark:text-gray-400">Device Information</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>Type:</strong> {getSessionData()?.deviceType || 'N/A'}</p>
                        <p><strong>Resolution:</strong> {getSessionData()?.screenResolution || 'N/A'}</p>
                        <p><strong>Language:</strong> {getSessionData()?.language || 'N/A'}</p>
                        <p><strong>Timezone:</strong> {getSessionData()?.timezone || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Session Details</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>Started:</strong> {getSessionData()?.startTime ? formatTime(getSessionData()!.startTime) : 'N/A'}</p>
                        <p><strong>Last Activity:</strong> {getSessionData()?.lastActivity ? formatTime(getSessionData()!.lastActivity) : 'N/A'}</p>
                        <p><strong>Current Page:</strong> {getSessionData()?.currentPage || 'N/A'}</p>
                        <p><strong>Referrer:</strong> {getSessionData()?.referrer || 'Direct'}</p>
                        {((sessionData as SessionData & { sessionData?: { session_replay_id?: string } })?.sessionData?.session_replay_id) && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Session Replay ID</p>
                            <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                              {((sessionData as SessionData & { sessionData?: { session_replay_id?: string } }).sessionData?.session_replay_id)}
                            </p>
                          </div>
                        )}
                        {((sessionData as SessionData & { sessionData?: { is_demo_session?: boolean } }).sessionData?.is_demo_session !== undefined) && (
                          <div className="mt-2">
                            <p><strong>Is Demo Session:</strong> {(sessionData as SessionData & { sessionData?: { is_demo_session?: boolean } }).sessionData?.is_demo_session ? 'Yes' : 'No'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Page Views Analysis */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
          <button
            onClick={() => toggleSection('pageViews')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Page Views Analysis ({(() => {
                  const pageViews = getPageViews();
                  return Array.isArray(pageViews) ? pageViews.length : (typeof pageViews === 'number' ? pageViews : 0);
                })()})
              </h3>
            </div>
            {expandedSections.has('pageViews') ? 
              <ChevronDown className="h-5 w-5 text-gray-600" /> : 
              <ChevronRight className="h-5 w-5 text-gray-600" />
            }
          </button>
          
          <AnimatePresence>
            {expandedSections.has('pageViews') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="space-y-3">
                    {(() => {
                      const pageViews = getPageViews();
                      return typeof pageViews === 'number' ? (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Page Views</span>
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Total page views: <strong>{pageViews}</strong>
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Detailed page view data is not available in the current format.
                          </p>
                        </div>
                      ) : (
                        Array.isArray(pageViews) ? pageViews.map((page: unknown, index: number) => {
                          const pageData = page as { pageName?: string; page_name?: string; title?: string; url?: string; current_url?: string; timestamp?: string; exitPage?: boolean; exit_page?: boolean; chatbotPresent?: boolean; chatbot_present?: boolean; timeSpent?: number; time_spent?: number; scrollDepth?: number; scroll_depth?: number };
                          // Get page name from various possible fields
                          const pageName = pageData.pageName || pageData.page_name || pageData.title || 
                                         (pageData.url ? new URL(pageData.url).pathname.split('/').pop()?.replace(/-/g, ' ') || 'Page' : 'Untitled Page');
                          // Format page name
                          const formattedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-/g, ' ');
                          
                          return (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                    #{index + 1}
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {formattedPageName}
                                  </span>
                                  {(pageData.exitPage || pageData.exit_page) && (
                                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                                      Exit Page
                                    </span>
                                  )}
                                  {(pageData.chatbotPresent || pageData.chatbot_present) && (
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                                      Chatbot Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {formatTime(String(pageData.timestamp || new Date().toISOString()))}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400">URL</p>
                                  <p className="font-mono text-xs break-all">{pageData.url || pageData.current_url || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400">Time Spent</p>
                                  <p className="font-semibold">
                                    {(() => {
                                      const timeSpent = pageData.timeSpent || pageData.time_spent || 0;
                                      // If time is in milliseconds, convert to seconds for display
                                      const timeInSeconds = timeSpent >= 1000 ? Math.floor(timeSpent / 1000) : timeSpent;
                                      return timeInSeconds > 0 ? formatDuration(timeSpent) : '0s';
                                    })()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400">Scroll Depth</p>
                                  <p className="font-semibold">
                                    {(pageData.scrollDepth || pageData.scroll_depth || 0)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }) : null
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* External Links */}
        {externalLinks.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('externalLinks')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  External Links Clicked ({externalLinks.length})
                </h3>
              </div>
              {expandedSections.has('externalLinks') ? 
                <ChevronDown className="h-5 w-5 text-gray-600" /> : 
                <ChevronRight className="h-5 w-5 text-gray-600" />
              }
            </button>
            
            <AnimatePresence>
              {expandedSections.has('externalLinks') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="space-y-3">
                      {externalLinks.map((link, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4 text-red-600" />
                              <span className="font-semibold text-gray-900 dark:text-white">
                                External Link #{index + 1}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatTime(String(link.timestamp || new Date().toISOString()))}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">URL</p>
                              {(() => {
                                const linkData = link.data as { url?: string } | undefined;
                                const url = linkData?.url;
                                return url ? (
                                  <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline break-all"
                                  >
                                    {url}
                                  </a>
                                ) : (
                                  <p className="text-sm text-gray-500">No URL available</p>
                                );
                              })()}
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Page</p>
                              <p className="text-sm">{String(link.page || 'Unknown')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Element</p>
                              <p className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {String(link.element || 'Unknown')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Form Interactions - Show ALL form interactions (not just submissions) */}
        {formInteractions.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('formInteractions')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Form Interactions ({formInteractions.length})
                </h3>
              </div>
              {expandedSections.has('formInteractions') ? 
                <ChevronDown className="h-5 w-5 text-gray-600" /> : 
                <ChevronRight className="h-5 w-5 text-gray-600" />
              }
            </button>
            
            <AnimatePresence>
              {expandedSections.has('formInteractions') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {formInteractions.map((interaction: { action?: string; type?: string; field_name?: string; fieldName?: string; element?: string; value?: string; field_value?: string; timestamp?: string; [key: string]: unknown }, index: number) => {
                        const actionType = interaction.action || interaction.type || 'form_interaction';
                        const fieldName = interaction.field_name || interaction.fieldName || interaction.element || 'Unknown Field';
                        const fieldValue = interaction.value || interaction.field_value || '';
                        const timestamp = interaction.timestamp || new Date().toISOString();
                        
                        return (
                          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getInteractionIcon(actionType)}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                  actionType === 'submit' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                  actionType === 'focus' || actionType === 'form_focus' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  actionType === 'change' || actionType === 'input' ? 'bg-green-100 text-green-800 border-green-200' :
                                  actionType === 'blur' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                  'bg-purple-100 text-purple-800 border-purple-200'
                                }`}>
                                  {actionType.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-400">#{index + 1}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatTime(timestamp)}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">Field</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{String(fieldName)}</p>
                              </div>
                              {fieldValue && (
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400">Value</p>
                                  <p className="font-semibold text-gray-900 dark:text-white break-words">
                                    {typeof fieldValue === 'string' ? fieldValue.substring(0, 100) : JSON.stringify(fieldValue).substring(0, 100)}
                                    {String(fieldValue).length > 100 ? '...' : ''}
                                  </p>
                                </div>
                              )}
                              {(() => {
                                const interactionPage = interaction.page;
                                return interactionPage ? (
                                  <div>
                                    <p className="text-gray-600 dark:text-gray-400">Page</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{String(interactionPage)}</p>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                            {(() => {
                              const interactionData = interaction.data;
                              if (interactionData && typeof interactionData === 'object' && interactionData !== null && Object.keys(interactionData).length > 0) {
                                return (
                                  <details className="mt-2">
                                    <summary className="text-gray-600 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                                      View Details
                                    </summary>
                                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 overflow-x-auto">
                                      {JSON.stringify(interactionData, null, 2)}
                                    </pre>
                                  </details>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        );
                      })}
                      {formInteractions.length === 0 && (
                        <div className="text-center py-8">
                          <Target className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">No form interaction data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Form Submissions */}
        {formSubmissions.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('formSubmissions')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Form Submissions ({formSubmissions.length})
                </h3>
              </div>
              {expandedSections.has('formSubmissions') ? 
                <ChevronDown className="h-5 w-5 text-gray-600" /> : 
                <ChevronRight className="h-5 w-5 text-gray-600" />
              }
            </button>
            
            <AnimatePresence>
              {expandedSections.has('formSubmissions') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="space-y-4">
                      {formSubmissions.map((submission, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-orange-600" />
                              <span className="font-semibold text-gray-900 dark:text-white">
                                Form Submission #{index + 1}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatTime(String(submission.timestamp || new Date().toISOString()))}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                              const submissionData = submission.data;
                              if (submissionData && typeof submissionData === 'object' && submissionData !== null) {
                                return Object.entries(submissionData).map(([key, value]) => (
                                  <div key={key}>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                      {String(value)}
                                    </p>
                                  </div>
                                ));
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Custom Events */}
        {customEvents.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('customEvents')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Custom Events ({customEvents.length})
                </h3>
              </div>
              {expandedSections.has('customEvents') ? 
                <ChevronDown className="h-5 w-5 text-gray-600" /> : 
                <ChevronRight className="h-5 w-5 text-gray-600" />
              }
            </button>
            
            <AnimatePresence>
              {expandedSections.has('customEvents') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {customEvents.map((event: unknown, index: number) => {
                        const eventData = event as { name?: string; type?: string; timestamp?: string; message?: string; data?: { [key: string]: unknown }; [key: string]: unknown };
                        return (
                          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-yellow-600" />
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {eventData.name || eventData.type || `Custom Event #${index + 1}`}
                                </span>
                                <span className="text-xs text-gray-400">#{index + 1}</span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {formatTime(String(eventData.timestamp || new Date().toISOString()))}
                              </span>
                            </div>
                            {(() => {
                              const data = eventData.data;
                              if (data && typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
                                return (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Event Data:</p>
                                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(data, null, 2)}
                                    </pre>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {eventData.message && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                {String(eventData.message)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Chatbot Interactions */}
        {chatbotInteractions.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('chatbot')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Chatbot Interactions ({chatbotInteractions.length})
                </h3>
              </div>
              {expandedSections.has('chatbot') ? 
                <ChevronDown className="h-5 w-5 text-gray-600" /> : 
                <ChevronRight className="h-5 w-5 text-gray-600" />
              }
            </button>
            
            <AnimatePresence>
              {expandedSections.has('chatbot') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="space-y-3 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      {chatbotInteractions.map((interaction: unknown, index: number) => {
                        const interactionData = interaction as { type?: string; event_type?: string; message?: string; element?: string | { message?: string }; data?: { message?: string; text?: string; message_length?: number }; timestamp?: string; message_length?: number; [key: string]: unknown };
                        const interactionType = interactionData.type || interactionData.event_type || '';
                        const message = interactionData.message || interactionData.data?.message || interactionData.data?.text || 
                                       (interactionData.element && typeof interactionData.element === 'object' ? interactionData.element?.message : '');
                        const isUserMessage = interactionType === 'message_sent' || interactionType === 'user_message' || interactionType === 'user_input';
                        const isBotMessage = interactionType === 'message_received' || interactionType === 'bot_message' || interactionType === 'bot_response' || interactionType === 'bot_initialized';
                        const timestamp = interactionData.timestamp || new Date().toISOString();
                        
                        return (
                          <div key={index} className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 ${
                              isUserMessage 
                                ? 'bg-blue-500 text-white' 
                                : isBotMessage 
                                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600' 
                                  : 'bg-yellow-50 dark:bg-yellow-900/20 text-gray-700 dark:text-gray-300 border border-yellow-200 dark:border-yellow-800'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-semibold ${
                                  isUserMessage ? 'text-blue-100' : isBotMessage ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-700 dark:text-yellow-300'
                                }`}>
                                  {isUserMessage ? '👤 User' : isBotMessage ? '🤖 Bot' : '⚙️ System'}
                                </span>
                                <span className={`text-xs ${
                                  isUserMessage ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {formatTime(timestamp)}
                                </span>
                              </div>
                              {message && (
                                <p className={`text-sm ${isUserMessage ? 'text-white' : 'text-gray-900 dark:text-white'} whitespace-pre-wrap break-words`}>
                                  {message}
                                </p>
                              )}
                              {!message && (() => {
                                const data = interactionData.data;
                                if (data && typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
                                  return (
                                    <div className="text-xs mt-1">
                                      <pre className={`overflow-x-auto ${isUserMessage ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {JSON.stringify(data, null, 2)}
                                      </pre>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              {(() => {
                                const dataObj = interactionData.data as { message_length?: number } | undefined;
                                const messageLength = dataObj?.message_length || interactionData.message_length;
                                return messageLength && typeof messageLength === 'number' ? (
                                  <p className={`text-xs mt-1 ${
                                    isUserMessage ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {String(messageLength)} characters
                                  </p>
                                ) : null;
                              })()}
                              {interactionType && !isUserMessage && !isBotMessage && (
                                <p className={`text-xs mt-1 font-medium ${
                                  isUserMessage ? 'text-blue-200' : 'text-yellow-700 dark:text-yellow-300'
                                }`}>
                                  Event: {interactionType.replace('_', ' ')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {chatbotInteractions.length === 0 && (
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">No chatbot conversation data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* All Interactions */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
          <button
            onClick={() => toggleSection('interactions')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                All Interactions ({Array.isArray(interactions) ? interactions.length : (typeof interactions === 'number' ? interactions : 0)})
              </h3>
            </div>
            {expandedSections.has('interactions') ? 
              <ChevronDown className="h-5 w-5 text-gray-600" /> : 
              <ChevronRight className="h-5 w-5 text-gray-600" />
            }
          </button>
          
          <AnimatePresence>
            {expandedSections.has('interactions') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                  {/* Filter Controls */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedInteractionType('all')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedInteractionType === 'all'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      All ({Array.isArray(interactions) ? interactions.length : (typeof interactions === 'number' ? interactions : 0)})
                    </button>
                    {interactionTypes.map((type: string) => (
                      <button
                        key={type}
                        onClick={() => setSelectedInteractionType(type)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedInteractionType === type
                            ? getInteractionColor(type)
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {type.replace('_', ' ')} ({Array.isArray(interactions) ? interactions.filter((i: { type?: string }) => i.type === type).length : 0})
                      </button>
                    ))}
                  </div>
                  
                  {/* Interactions List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {typeof interactions === 'number' ? (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Session Interactions</span>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Total interactions recorded: <strong>{interactions}</strong>
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Detailed interaction data is not available in the current format.
                        </p>
                      </div>
                    ) : (
                      filteredInteractions.map((interaction: unknown, index: number) => {
                        const interactionData = interaction as { type?: string; element?: string | Record<string, unknown> | null; element_name?: string; timestamp?: string; page?: string; data?: { [key: string]: unknown }; [key: string]: unknown };
                        // Get readable element name - ensure it's always a string
                        const elementValue = interactionData.element;
                        const elementName = typeof elementValue === 'string' ? elementValue : (interactionData.element_name || 'Unknown Element');
                        const isTechnicalSelector = typeof elementName === 'string' && (elementName.includes('.') || elementName.includes('#'));
                        const interactionType = interactionData.type || 'unknown';
                        
                        return (
                          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getInteractionIcon(interactionType)}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getInteractionColor(interactionType)}`}>
                                  {interactionType.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-400">#{index + 1}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatTime(String(interactionData.timestamp || new Date().toISOString()))}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-gray-600 dark:text-gray-400">Page</p>
                                <p className="font-semibold">{String(interactionData.page || 'Unknown')}</p>
                              </div>
                              {elementName && (
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400">Element</p>
                                  {isTechnicalSelector ? (
                                    <div>
                                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Element Interaction</p>
                                      <p className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1 break-all">
                                        {String(elementName)}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="font-semibold text-gray-900 dark:text-white">{String(elementName)}</p>
                                  )}
                                </div>
                              )}
                            </div>
                            {interactionData.data && typeof interactionData.data === 'object' && interactionData.data !== null && Object.keys(interactionData.data).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-gray-600 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                                  View Details
                                </summary>
                                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto mt-1">
                                  {JSON.stringify(interactionData.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Session Insights */}
        {sessionData && sessionData.sessionInsights && Object.keys(sessionData.sessionInsights).length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('insights')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session Insights</h3>
              </div>
              {expandedSections.has('insights') ? 
                <ChevronDown className="h-5 w-5 text-gray-600" /> : 
                <ChevronRight className="h-5 w-5 text-gray-600" />
              }
            </button>
            
            <AnimatePresence>
              {expandedSections.has('insights') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      {(() => {
                        const insights = sessionData.sessionInsights;
                        // If insights has structured data, display it nicely
                        const insightsObj = insights as { intent_level?: string; engagement_level?: string; key_indicators?: string[] | unknown[]; [key: string]: unknown };
                        if (insightsObj.intent_level || insightsObj.engagement_level || insightsObj.key_indicators) {
                          return (
                            <div className="space-y-4">
                              {insightsObj.intent_level && (
                                <div>
                                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Intent Level</p>
                                  <p className={`text-lg font-semibold ${
                                    insightsObj.intent_level === 'high' ? 'text-green-600' :
                                    insightsObj.intent_level === 'medium' ? 'text-yellow-600' :
                                    'text-gray-600'
                                  }`}>
                                    {String(insightsObj.intent_level).toUpperCase()}
                                  </p>
                                </div>
                              )}
                              {insightsObj.engagement_level && (
                                <div>
                                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Engagement Level</p>
                                  <p className={`text-lg font-semibold ${
                                    insightsObj.engagement_level === 'high' ? 'text-green-600' :
                                    insightsObj.engagement_level === 'medium' ? 'text-yellow-600' :
                                    'text-gray-600'
                                  }`}>
                                    {String(insightsObj.engagement_level).toUpperCase()}
                                  </p>
                                </div>
                              )}
                              {insightsObj.key_indicators && Array.isArray(insightsObj.key_indicators) && insightsObj.key_indicators.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Key Indicators</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {insightsObj.key_indicators.map((indicator: unknown, idx: number) => (
                                      <li key={idx} className="text-sm text-gray-900 dark:text-white">{String(indicator)}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {Object.keys(insights).filter(key => !['intent_level', 'engagement_level', 'key_indicators'].includes(key)).length > 0 && (
                                <details className="mt-4">
                                  <summary className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                                    View Raw Data
                                  </summary>
                                  <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-2 overflow-x-auto">
                                    {JSON.stringify(insights, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          );
                        }
                        // Otherwise, display as formatted JSON
                        return (
                          <pre className="text-sm text-gray-900 dark:text-white overflow-x-auto">
                            {JSON.stringify(insights, null, 2)}
                          </pre>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComprehensiveSessionAnalysis;
