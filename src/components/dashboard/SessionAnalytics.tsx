'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Badge from '@/components/ui/badge/Badge';
import { 
  TrendingUp, 
  Clock, 
  MousePointer, 
  Eye, 
  Smartphone, 
  Monitor, 
  Tablet,
  ExternalLink,
  MessageCircle,
  FileText,
  Users
} from 'lucide-react';
import { formatTimeForDisplay, convertToMinutes, formatTimestamp } from '@/utils/timeUtils';

interface SessionData {
  session_id: string;
  visitor_id: string;
  start_time: string;
  last_activity: string;
  total_time_on_site: number;
  page_views: Array<{
    url: string;
    title: string;
    page_name: string;
    timestamp: string;
    time_spent: number;
    scroll_depth: number;
    exit_page: boolean;
  }>;
  interactions: Array<{
    type: string;
    element: string;
    timestamp: string;
    page: string;
    data?: Record<string, unknown>;
  }>;
  form_interactions: Array<{
    form_id: string;
    form_class: string;
    form_action: string;
    form_method: string;
    action: string;
    field_name: string;
    field_value: string;
    field_type: string;
    timestamp: string;
    page: string;
    url: string;
  }>;
  chatbot_events: Array<{
    type: string;
    message: string;
    timestamp: string;
    data?: Record<string, unknown>;
  }>;
  referrer: string;
  device_type: 'desktop' | 'tablet' | 'mobile';
  language: string;
  timezone: string;
  screen_resolution: string;
  current_page: string;
  current_url: string;
  landing_page_url: string;
  browser_info: {
    name: string;
    version: string;
    user_agent: string;
  };
  operating_system: {
    name: string;
    user_agent: string;
  };
  utm_parameters: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_term: string;
    utm_content: string;
  };
  traffic_channel: string;
  scroll_depth: number;
  is_returning_user: boolean;
  website: string;
  is_demo_session: boolean;
  is_lead_session: boolean;
  bot_interaction: boolean;
  demo_page: boolean;
}

interface SessionAnalyticsProps {
  sessionData?: SessionData;
  leadId?: string;
}

const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({ sessionData }) => {
  
  const [analytics, setAnalytics] = useState({
    sessionScore: 0,
    engagementLevel: 'low',
    intentLevel: 'low',
    keyInsights: [] as string[],
    deviceBreakdown: {
      desktop: 0,
      tablet: 0,
      mobile: 0
    },
    topPages: [] as Array<{ url: string; timeSpent: number; visits: number }>,
    interactionTypes: {} as Record<string, number>
  });

  const calculateAnalytics = (data: SessionData) => {
    
    let score = 0;
    const insights: string[] = [];
    
    // Time on site scoring
    const timeInMinutes = convertToMinutes(data.total_time_on_site);
    
    if (timeInMinutes > 5) {
      score += 25;
      insights.push('Spent 5+ minutes on site');
    } else if (timeInMinutes > 2) {
      score += 15;
      insights.push('Spent 2+ minutes on site');
    }
    
    // Page views scoring
    const pageViewCount = data.page_views?.length || 0;
    if (pageViewCount > 5) {
      score += 20;
      insights.push('Viewed 5+ pages');
    } else if (pageViewCount > 2) {
      score += 10;
      insights.push('Viewed multiple pages');
    }
    
    // Device type scoring
    if (data.device_type === 'desktop') {
      score += 10;
      insights.push('Used desktop device');
    } else if (data.device_type === 'tablet') {
      score += 7;
    } else {
      score += 5;
    }
    
    // Interaction scoring
    const interactionCount = data.interactions?.length || 0;
    if (interactionCount > 10) {
      score += 20;
      insights.push('High interaction level');
    } else if (interactionCount > 5) {
      score += 10;
      insights.push('Moderate interaction level');
    }
    
    // Referrer scoring
    if (data.referrer && data.referrer.includes('linkedin')) {
      score += 15;
      insights.push('Came from LinkedIn');
    } else if (data.referrer && data.referrer.includes('google')) {
      score += 10;
      insights.push('Came from Google');
    }
    
    // Chatbot engagement
    const chatbotInteractions = data.chatbot_events || [];
    if (chatbotInteractions.length > 0) {
      score += 15;
      insights.push('Engaged with chatbot');
    }
    
    // Form interactions
    const formInteractions = data.form_interactions || [];
    if (formInteractions.length > 0) {
      score += 20;
      insights.push('Interacted with forms');
    }
    
    // Click interactions
    const clickInteractions = (data.interactions || []).filter(i => 
      i && typeof i === 'object' && i.type === 'click'
    );
    if (clickInteractions.length > 5) {
      score += 10;
      insights.push('High click activity');
    }
    
    // High-value page visits
    const highValuePages = ['pricing', 'contact', 'demo', 'enterprise', 'quote'];
    const visitedHighValue = (data.page_views || []).some(page => 
      highValuePages.some(hvp => page.url.toLowerCase().includes(hvp))
    );
    if (visitedHighValue) {
      score += 20;
      insights.push('Visited high-value pages');
    }
    
    // Demo session bonus
    if (data.is_demo_session) {
      score += 10;
      insights.push('Demo session');
    }
    
    // Lead session bonus
    if (data.is_lead_session) {
      score += 15;
      insights.push('Lead generation session');
    }
    
    // Bot interaction bonus
    if (data.bot_interaction) {
      score += 10;
      insights.push('Bot interaction');
    }
    
    // Calculate engagement level
    let engagementLevel = 'low';
    if (score >= 70) engagementLevel = 'high';
    else if (score >= 40) engagementLevel = 'medium';
    
    // Calculate intent level
    let intentLevel = 'low';
    if (visitedHighValue && timeInMinutes > 3) intentLevel = 'high';
    else if (pageViewCount > 3 || timeInMinutes > 2) intentLevel = 'medium';
    
    // Analyze page visits
    const pageStats: Record<string, { timeSpent: number; visits: number }> = {};
    (data.page_views || []).forEach(page => {
      try {
        const url = new URL(page.url).pathname;
        if (!pageStats[url]) {
          pageStats[url] = { timeSpent: 0, visits: 0 };
        }
        pageStats[url].timeSpent += page.time_spent || 0;
        pageStats[url].visits += 1;
      } catch {
        // Handle invalid URLs
        const url = page.url;
        if (!pageStats[url]) {
          pageStats[url] = { timeSpent: 0, visits: 0 };
        }
        pageStats[url].timeSpent += page.time_spent || 0;
        pageStats[url].visits += 1;
      }
    });
    
    const topPages = Object.entries(pageStats)
      .map(([url, stats]) => ({ url, ...stats }))
      .sort((a, b) => b.timeSpent - a.timeSpent)
      .slice(0, 5);
    
    // Analyze interaction types
    const interactionTypes: Record<string, number> = {};
    (data.interactions || []).forEach(interaction => {
      if (interaction && typeof interaction === 'object' && interaction.type && typeof interaction.type === 'string') {
        interactionTypes[interaction.type] = (interactionTypes[interaction.type] || 0) + 1;
      }
    });
    
    // Add form interactions to interaction types
    (data.form_interactions || []).forEach(formInteraction => {
      if (formInteraction && typeof formInteraction === 'object' && formInteraction.action) {
        interactionTypes[`form_${formInteraction.action}`] = (interactionTypes[`form_${formInteraction.action}`] || 0) + 1;
      }
    });
    
    // Add chatbot events to interaction types
    (data.chatbot_events || []).forEach(chatbotEvent => {
      if (chatbotEvent && typeof chatbotEvent === 'object' && chatbotEvent.type) {
        interactionTypes[chatbotEvent.type] = (interactionTypes[chatbotEvent.type] || 0) + 1;
      }
    });
    
    setAnalytics({
      sessionScore: Math.min(score, 100),
      engagementLevel,
      intentLevel,
      keyInsights: insights,
      deviceBreakdown: {
        desktop: data.device_type === 'desktop' ? 1 : 0,
        tablet: data.device_type === 'tablet' ? 1 : 0,
        mobile: data.device_type === 'mobile' ? 1 : 0
      },
      topPages,
      interactionTypes
    });
  };

  useEffect(() => {
    if (sessionData && typeof sessionData === 'object') {
      calculateAnalytics(sessionData);
    }
  }, [sessionData]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop': return <Monitor className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Smartphone className="h-4 w-4" />;
    }
  };

  if (!sessionData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Website Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No session data available for this lead.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Session Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(analytics.sessionScore)}`}>
                {analytics.sessionScore}/100
              </div>
              <p className="text-sm text-gray-600 mt-1">Session Score</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                {getDeviceIcon(sessionData.device_type)}
                <span className="font-medium capitalize">{sessionData.device_type}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Device Type</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {formatTimeForDisplay(sessionData.total_time_on_site, 'short')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Time on Site</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <MousePointer className="h-4 w-4" />
                <span className="font-medium">
                  {sessionData.interactions?.length || 0}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Interactions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement & Intent Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Engagement Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge color={getLevelColor(analytics.engagementLevel) === 'bg-green-100 text-green-800' ? 'success' : getLevelColor(analytics.engagementLevel) === 'bg-yellow-100 text-yellow-800' ? 'warning' : 'error'}>
              {analytics.engagementLevel.toUpperCase()}
            </Badge>
            <p className="text-sm text-gray-600 mt-2">
              Based on interactions, time spent, and page views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Intent Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge color={getLevelColor(analytics.intentLevel) === 'bg-green-100 text-green-800' ? 'success' : getLevelColor(analytics.intentLevel) === 'bg-yellow-100 text-yellow-800' ? 'warning' : 'error'}>
              {analytics.intentLevel.toUpperCase()}
            </Badge>
            <p className="text-sm text-gray-600 mt-2">
              Based on pages visited and engagement patterns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      {analytics.keyInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.keyInsights.map((insight, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Page Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm truncate">{page.url}</p>
                  <p className="text-xs text-gray-500">{page.visits} visit{page.visits !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatTimeForDisplay(page.timeSpent, 'short')}</p>
                  <p className="text-xs text-gray-500">time spent</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interaction Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5" />
            Interaction Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(analytics.interactionTypes).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(analytics.interactionTypes).map(([type, count]) => (
                <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {type.includes('chatbot') && <MessageCircle className="h-4 w-4" />}
                    {type.includes('click') && <MousePointer className="h-4 w-4" />}
                    {type.includes('form') && <FileText className="h-4 w-4" />}
                    {type.includes('external') && <ExternalLink className="h-4 w-4" />}
                    {!type.includes('chatbot') && !type.includes('click') && !type.includes('form') && !type.includes('external') && <Eye className="h-4 w-4" />}
                  </div>
                  <p className="text-sm font-medium">{count}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {type.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MousePointer className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">No interaction data available</p>
              <p className="text-sm text-gray-400 mt-1">Interaction analytics will appear here when available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Session ID:</strong> {sessionData.session_id}</p>
              <p><strong>Visitor ID:</strong> {sessionData.visitor_id}</p>
              <p><strong>Start Time:</strong> {formatTimestamp(sessionData.start_time, 'datetime')}</p>
              <p><strong>Last Activity:</strong> {formatTimestamp(sessionData.last_activity, 'datetime')}</p>
            </div>
            <div>
              <p><strong>Language:</strong> {sessionData.language}</p>
              <p><strong>Timezone:</strong> {sessionData.timezone}</p>
              <p><strong>Screen Resolution:</strong> {sessionData.screen_resolution}</p>
              <p><strong>Browser:</strong> {sessionData.browser_info?.name} {sessionData.browser_info?.version}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Current Page:</strong> {sessionData.current_page}</p>
              <p><strong>Landing Page:</strong> {sessionData.landing_page_url}</p>
              <p><strong>Traffic Channel:</strong> {sessionData.traffic_channel}</p>
            </div>
            <div>
              <p><strong>Is Demo Session:</strong> {sessionData.is_demo_session ? 'Yes' : 'No'}</p>
              <p><strong>Is Lead Session:</strong> {sessionData.is_lead_session ? 'Yes' : 'No'}</p>
              <p><strong>Bot Interaction:</strong> {sessionData.bot_interaction ? 'Yes' : 'No'}</p>
            </div>
          </div>
          {sessionData.referrer && (
            <div className="mt-4">
              <p><strong>Referrer:</strong> {sessionData.referrer}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionAnalytics;
