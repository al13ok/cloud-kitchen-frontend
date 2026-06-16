'use client';

 

import React, { useState, useEffect, useRef } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import DashboardHeader from "@/components/header/DashboardHeader";
import {
  Users, 
  TrendingUp, 
  CheckCircle, 
  BarChart3,
  Search,
  Trophy,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { BACKEND_URL, getAuthHeaders, fetchWithTimeout } from '@/utils/api';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

 

// Agent Performance interface (merged with agent profile data)
interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  department: string;
  current_workload: number;
  total_leads_closed: number;
  today_leads_closed: number;
  today_leads_assigned: number;
  total_leads_assigned?: number;
  conversion_rate?: number;
  performance_score?: number;
}

 

interface OverallMetrics {
  total_agents: number;
  total_leads_assigned: number;
  total_leads_closed: number;
  overall_conversion_rate: number;
  average_workload: number;
  top_performer: string;
}

export default function AgentPerformancePage() {
  const [agentsData, setAgentsData] = useState<AgentPerformance[]>([]);
  const [overallMetrics, setOverallMetrics] = useState<OverallMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const hasFetchedData = useRef(false);


  // Helper function to capitalize first letter of a string
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

 

  useEffect(() => {
      if (!hasFetchedData.current) {
        fetchAgentPerformance();
        hasFetchedData.current = true;
      }
  
  // Listen for lead closed events to refresh data
    const refreshOnClose = () => {
      fetchAgentPerformance();
    };
    window.addEventListener('lead-closed', refreshOnClose as EventListener);
    return () => window.removeEventListener('lead-closed', refreshOnClose as EventListener);
  }, []);

 

  const fetchAgentPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching agent performance data...');
      
      const authHeaders = getAuthHeaders();
      
      // Fetch agent profiles - try multiple endpoints with fallback (same as agent-profiles)
      interface AgentProfile {
        agent_id?: string;
        id?: string;
        _id?: string;
        agent_name?: string;
        name?: string;
        agent_email?: string;
        email?: string;
        agentEmail?: string;
        user_email?: string;
        userEmail?: string;
        user?: { email?: string; user_email?: string };
        userId?: string;
        department?: string;
        current_workload?: number;
        [key: string]: unknown;
      }
      let profileData: AgentProfile[] = [];
      let fetched = false;
      
      // First try: /api/v1/agents
      try {
        const response1 = await fetchWithTimeout(
          `${BACKEND_URL}/api/v1/agents?t=${Date.now()}`,
          {
            method: 'GET',
            headers: authHeaders,
            cache: 'no-store',




 

            timeoutMs: 10000,
          }
        );
        
        if (response1.ok) {
          const data = await response1.json();
          profileData = Array.isArray(data) ? data : (data.agents || data.agent || []);
          if (profileData.length > 0) {
            console.log('✅ Fetched agents from /api/v1/agents:', profileData.length);
            fetched = true;
          }
        }
      } catch (e) {
        console.log('⚠ /api/v1/agents failed:', e);
      }
      
      // Fallback: try /api/v1/lead-assignment/agent-profiles
      if (!fetched || profileData.length === 0) {
        try {
          const response2 = await fetchWithTimeout(
            `${BACKEND_URL}/api/v1/lead-assignment/agent-profiles?t=${Date.now()}`,
            {
              method: 'GET',
              headers: authHeaders,
              cache: 'no-store',
              timeoutMs: 10000,
            }
          );
          
          if (response2.ok) {
            const data = await response2.json();
            profileData = Array.isArray(data) ? data : [];
            console.log('✅ Fetched agents from /api/v1/lead-assignment/agent-profiles:', profileData.length);
            fetched = true;
          }
        } catch (e) {
          console.log('⚠ /api/v1/lead-assignment/agent-profiles failed:', e);
        }
      }
      
      // If still no data, show empty state
      if (!profileData || profileData.length === 0) {
        console.log('ℹ No agent profiles found - showing empty state');
          setAgentsData([]);
        setOverallMetrics(null);
        setError(null);
          setLoading(false);
          return;
        }
      
      // Helper function to fetch and count closed leads for an agent
      const fetchAgentClosedLeads = async (agentEmail: string): Promise<{ totalClosed: number; todayClosed: number; totalAssigned: number }> => {
        let totalClosed = 0;
        let todayClosed = 0;
        let totalAssigned = 0;
        
        try {
          if (!agentEmail) {
            console.log(`⚠ No email provided for agent`);
            return { totalClosed: 0, todayClosed: 0, totalAssigned: 0 };
          }

 

          console.log(`🔍 Fetching leads for agent: ${agentEmail}`);

 

          // Fetch leads assigned to this agent
                  const encodedEmail = encodeURIComponent(agentEmail);
          const assignedLeadsResponse = await fetchWithTimeout(
            `${BACKEND_URL}/api/v1/lead-assignment/agent-leads-by-email?email=${encodedEmail}`,
            {
              method: 'GET',
              headers: authHeaders,
              cache: 'no-store',
              timeoutMs: 15000,
            }
          );

 

          if (!assignedLeadsResponse.ok) {
            console.warn(`⚠ Failed to fetch leads for agent ${agentEmail}: ${assignedLeadsResponse.status}`);
            return { totalClosed: 0, todayClosed: 0, totalAssigned: 0 };
          }

 

          const leadsData = await assignedLeadsResponse.json();
          const assignedLeads = leadsData.leads || leadsData || [];
          totalAssigned = assignedLeads.length;

 

          console.log(`📊 Found ${totalAssigned} leads for agent ${agentEmail}`);

 

          if (assignedLeads.length === 0) {
            return { totalClosed: 0, todayClosed: 0, totalAssigned: 0 };
          }

 

          // Get today's date for comparison (in local timezone, start of day)
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(todayStart);
          todayEnd.setDate(todayEnd.getDate() + 1);
          
          // Helper function to check if a date is today (handles timezone issues)
          const isDateToday = (dateString: string | Date | null | undefined): boolean => {
            if (!dateString) return false;
            try {
              const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
              if (isNaN(date.getTime())) return false;
              
              // Compare dates by converting to local date strings (YYYY-MM-DD)
              const dateStr = date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
              const todayStr = todayStart.toLocaleDateString('en-CA');
              
              return dateStr === todayStr;
            } catch (e) {
              console.log('Date parsing error:', e, dateString);
              return false;
            }
          };

 

          // Fetch pipeline stage for each lead
          interface LeadData {
            id?: string;
            _id?: string;
            stage?: string;
            pipeline_stage?: string;
            updated_at?: string;
            updatedAt?: string;
            last_activity?: string;
            lastActivity?: string;
            closed_at?: string;
            closedAt?: string;
            [key: string]: unknown;
          }
          const pipelinePromises = assignedLeads.map(async (lead: LeadData) => {
            try {
              const leadId = lead.id || lead._id;
              if (!leadId) {
                console.log(`⚠ Lead missing ID:`, lead);
                return null;
              }

 

              // First, check if lead already has a stage field (faster)
              const leadStage = (lead.stage || lead.pipeline_stage || '').toLowerCase().trim();
              if (leadStage === 'closed won') {
                // Check if closed today - try multiple date fields
                const dateFields = [
                  lead.updated_at,
                  lead.updatedAt,
                  lead.last_activity,
                  lead.lastActivity,
                  lead.closed_at,
                  lead.closedAt
                ];
                
                let isToday = false;
                for (const dateField of dateFields) {
                  if (isDateToday(dateField)) {
                    isToday = true;
                    console.log(`✅ Lead ${leadId} closed today (from lead data):`, dateField);
                    break;
                  }
                }
                
                return { isClosed: true, isToday };
              }

 

              // If no stage in lead data, fetch from pipeline API
              const pipelineResponse = await fetchWithTimeout(
                `${BACKEND_URL}/api/v1/leads-integration/${leadId}/pipeline`,
                {
                  method: 'GET',
                  headers: authHeaders,
                  cache: 'no-store',
                  timeoutMs: 10000,
                }
              );

 

              if (!pipelineResponse.ok) {
                return null;
              }

 

              const pipelineData = await pipelineResponse.json();
              const currentStage = (pipelineData.current_stage || pipelineData.stage || leadStage || '').toLowerCase().trim();
              
              // Check if lead is "Closed Won" (handle variations: "closed won", "closedwon", etc.)
              const normalizedStage = currentStage.replace(/\s+/g, ' ').trim();
              if (normalizedStage === 'closed won' || normalizedStage === 'closedwon') {
                let isToday = false;
                
                // First, check pipeline history for when it was moved to "Closed Won" (most accurate)
                // Get ALL history entries for "Closed Won" and find the most recent one
                interface PipelineHistory {
                  stageId?: string;
                  stage?: string;
                  timestamp?: string;
                  created_at?: string;
                  date?: string;
                  [key: string]: unknown;
                }
                const history = (pipelineData.history || pipelineData.pipeline_history || []) as PipelineHistory[];
                const closedWonHistories = history.filter((h: PipelineHistory) => {
                  const stage = (h.stageId || h.stage || '').toLowerCase().trim().replace(/\s+/g, ' ');
                  return stage === 'closed won' || stage === 'closedwon';
                });
                
                // Sort by timestamp (most recent first) and check the latest one
                if (closedWonHistories.length > 0) {
                  closedWonHistories.sort((a: PipelineHistory, b: PipelineHistory) => {
                    const dateA = a.timestamp || a.created_at || a.date || 0;
                    const dateB = b.timestamp || b.created_at || b.date || 0;
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                  });
                  
                  const mostRecent = closedWonHistories[0];
                  const timestamp = mostRecent.timestamp || mostRecent.created_at || mostRecent.date;
                  
                  if (timestamp && isDateToday(timestamp)) {
                    isToday = true;
                    console.log(`✅ Lead ${leadId} closed today (from pipeline history):`, timestamp);
                  }
                }
                
                // If not found in history, check multiple date fields as fallback
                if (!isToday) {
                  const dateFields = [
                    pipelineData.updated_at,
                    pipelineData.last_updated,
                    pipelineData.closed_at,
                    lead.updated_at,
                    lead.updatedAt,
                    lead.last_activity,
                    lead.closed_at
                  ];
                  
                  for (const dateField of dateFields) {
                    if (isDateToday(dateField)) {
                      isToday = true;
                      console.log(`✅ Lead ${leadId} closed today (from fallback date):`, dateField);
                break;
              }
            }
                }
                
                if (!isToday) {
                  console.log(`ℹ Lead ${leadId} is Closed Won but not today. Stage: ${currentStage}`);
                }
                
                return { isClosed: true, isToday };
              }
              
              return null;
            } catch (error) {
              console.log(`❌ Failed to fetch pipeline for lead ${lead.id || lead._id}:`, error);
              return null;
            }
          });

 

          // Wait for all pipeline fetches to complete
          const results = await Promise.all(pipelinePromises);
          
          // Count closed leads
          results.forEach((result) => {
            if (result?.isClosed) {
              totalClosed++;
              if (result.isToday) {
                todayClosed++;
              }
            }
          });

 

          console.log(`✅ Agent ${agentEmail}: ${totalClosed} closed (${todayClosed} today) out of ${totalAssigned} total`);

 

        } catch (error) {
          console.error(`❌ Error fetching closed leads for agent ${agentEmail}:`, error);
        }

 

        return { totalClosed, todayClosed, totalAssigned };
      };

 

      // Fetch closed leads data for all agents in parallel (with concurrency limit)
      console.log('🔄 Fetching closed leads data for all agents...');
      const agentLeadsData: Record<string, { totalClosed: number; todayClosed: number; totalAssigned: number }> = {};
      
      // Process agents in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < profileData.length; i += batchSize) {
        const batch = profileData.slice(i, i + batchSize);
        const batchPromises = batch.map(async (profile: AgentProfile) => {
          // Try multiple field names for agent email
          const agentEmail = profile.agent_email || profile.email || profile.agentEmail || 
                            profile.user_email || profile.userEmail || 
                            (profile.user && (profile.user.email || profile.user.user_email));
          const agentId = profile.agent_id || profile.id || profile._id;
          
          console.log(`📋 Processing agent ${agentId}:`, {
            agent_name: profile.agent_name || profile.name,
            email_found: !!agentEmail,
            email: agentEmail || 'NOT FOUND',
            profile_keys: Object.keys(profile)
          });
          
          if (!agentEmail) {
            console.warn(`⚠ No email found for agent ${agentId}. Profile keys:`, Object.keys(profile));
            // Try to get email from user if profile has userId
            if (profile.userId) {
              try {
                const userResponse = await fetchWithTimeout(
                  `${BACKEND_URL}/api/v1/users/${profile.userId}`,
                  {
                    method: 'GET',
                    headers: authHeaders,
                    cache: 'no-store',
                    timeoutMs: 5000,
                  }
                );
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  const userEmail = userData.email || userData.user_email;
                  if (userEmail) {
                    console.log(`✅ Found email from user data: ${userEmail}`);
                    const data = await fetchAgentClosedLeads(userEmail);
                    return { agentId, data };
                  }
                }
              } catch {
                console.log(`Could not fetch user data for userId ${profile.userId}`);
              }
            }
            return { agentId, data: { totalClosed: 0, todayClosed: 0, totalAssigned: 0 } };
          }
          
          const data = await fetchAgentClosedLeads(agentEmail);
          return { agentId, data };
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ agentId, data }) => {
          if (agentId !== undefined && agentId !== null) {
            agentLeadsData[agentId] = data;
          }
        });
        
        console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(profileData.length / batchSize)}`);
      }
      
      console.log('📊 Final agent leads data:', agentLeadsData);
      
      // Merge the data with closed leads counts
      const mergedData: AgentPerformance[] = profileData
        .map((profile: AgentProfile) => {
          const agentId = profile.agent_id || profile.id || profile._id;
          
          // Skip profiles without a valid agent ID
          if (!agentId) {
            console.warn('⚠ Skipping profile without agent ID:', profile);
            return null;
          }
          
          const agentIdString = String(agentId);
          const leadsData = agentLeadsData[agentIdString] || { totalClosed: 0, todayClosed: 0, totalAssigned: 0 };
          
          const totalAssigned = leadsData.totalAssigned || profile.current_workload || 0;
          const totalClosed = leadsData.totalClosed;
          const todayLeadsClosed = leadsData.todayClosed;
          
          // Calculate conversion rate
          const conversionRate = totalAssigned > 0 
            ? (totalClosed / totalAssigned) * 100 
            : 0;
          
          // Calculate performance score (0-10 scale) - same formula as agent-dashboard
          let performanceScore = 0;
          if (totalAssigned > 0) {
            const conversionScore = Math.min(5, (conversionRate / 100) * 5);
            const closedLeadsScore = Math.min(3, (totalClosed / 10) * 3);
            const activityBonus = Math.min(2, (totalAssigned / 25) * 2);
            performanceScore = conversionScore + closedLeadsScore + activityBonus;
          }
          
          const agentData: AgentPerformance = {
            agent_id: agentIdString,
            agent_name: profile.agent_name || profile.name || 'Unknown',
            department: profile.department || 'General',
            current_workload: totalAssigned,
            total_leads_closed: totalClosed,
            today_leads_closed: todayLeadsClosed,
            today_leads_assigned: 0, // Not used in display, but keeping for consistency
            total_leads_assigned: totalAssigned,
            conversion_rate: conversionRate,
            performance_score: performanceScore
          };
          
          console.log(`📈 Agent ${agentData.agent_name} (${agentIdString}):`, {
            totalClosed,
            todayClosed: todayLeadsClosed,
            totalAssigned,
            conversionRate: conversionRate.toFixed(2) + '%'
          });
          
          return agentData;
        })
        .filter((agent): agent is AgentPerformance => agent !== null);
      
      console.log('✅ Merged data summary:', {
        totalAgents: mergedData.length,
        totalClosed: mergedData.reduce((sum, a) => sum + a.total_leads_closed, 0),
        totalTodayClosed: mergedData.reduce((sum, a) => sum + a.today_leads_closed, 0),
        agentsWithClosed: mergedData.filter(a => a.total_leads_closed > 0).length
      });
      
      // Calculate overall metrics
      const totalAgents = mergedData.length;
      const totalLeadsAssigned = mergedData.reduce((sum, agent) => sum + (agent.total_leads_assigned || 0), 0);
      const totalLeadsClosed = mergedData.reduce((sum, agent) => sum + agent.total_leads_closed, 0);
      const overallConversionRate = totalLeadsAssigned > 0 
        ? (totalLeadsClosed / totalLeadsAssigned) * 100 
        : 0;
      const averageWorkload = totalAgents > 0 
        ? mergedData.reduce((sum, agent) => sum + agent.current_workload, 0) / totalAgents 
        : 0;
      const topPerformer = mergedData.length > 0 
        ? mergedData.reduce((top, agent) => 
            agent.total_leads_closed > top.total_leads_closed ? agent : top, mergedData[0])
        : null;
      
      setOverallMetrics({
        total_agents: totalAgents,
        total_leads_assigned: totalLeadsAssigned,
        total_leads_closed: totalLeadsClosed,
        overall_conversion_rate: overallConversionRate,
        average_workload: averageWorkload,
        top_performer: topPerformer?.agent_name || 'N/A'
      });
      
      setAgentsData(mergedData);
      setError(null);
    } catch (err) {
      console.error("Error fetching agent performance:", err);
      setError(null);
      setAgentsData([]);
      setOverallMetrics(null);
    } finally {
      setLoading(false);
    }
  };

 

  const filteredAgents = agentsData.filter(agent => {
    const matchesSearch = agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          agent.agent_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

 

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative mt-6 sm:mt-8 z-10">
        <div className="px-4 sm:px-6 space-y-6 sm:space-y-8">
          {/* Professional Header */}
          <DashboardHeader
            variant="default"
            size="lg"
            title="Agent Performance"
            subtitle="Comprehensive performance analytics, conversion tracking, and workload management for your sales team • Enterprise Workspace"
            hideTenantPrefix={true}
            breadcrumbs={[
              { label: "Home", href: "/" },
              { label: "Agent Performance", href: "/agent-performance" }
            ]}
            icon={() => (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 sm:w-8 sm:h-8 text-white"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            )}
            actions={
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAgentPerformance}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh agent performance data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            }
          />
          {/* Overall Performance Metrics Cards */}
          {overallMetrics && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Agents</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {overallMetrics.total_agents}
                    </p>
                  </div>
                </div>
              </div>

 

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Leads Closed</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {overallMetrics.total_leads_closed}
                    </p>
                  </div>
                </div>
              </div>

 

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Conversion Rate</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {overallMetrics.overall_conversion_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

 

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Performer</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {capitalizeFirstLetter(overallMetrics.top_performer)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

 

          {/* Performance Charts Section */}
          {!loading && agentsData.length > 0 && (
            <div className="space-y-6">
              {/* Leads Closed by Agent - Bar Chart (Full Width) */}
          <ComponentCard 
                title="Leads Closed by Agent" 
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-white/20 dark:border-gray-700/50 shadow-xl"
              >
                <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                      data={agentsData
                        .sort((a, b) => b.total_leads_closed - a.total_leads_closed)
                        .slice(0, 10)
                        .map(agent => ({
                          name: agent.agent_name.length > 12 
                            ? agent.agent_name.substring(0, 12) + '...' 
                            : agent.agent_name,
                          fullName: agent.agent_name,
                          leadsClosed: agent.total_leads_closed,
                          todayClosed: agent.today_leads_closed,
                          workload: agent.current_workload
                        }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                        height={80}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        className="dark:text-gray-400"
                  />
                  <YAxis 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        className="dark:text-gray-400"
                        allowDecimals={false}
                        tickFormatter={(value: number | string) => {
                          if (typeof value === 'number') {
                            return Math.round(value).toString();
                          }
                          const num = parseFloat(String(value));
                          return isNaN(num) ? '0' : Math.round(num).toString();
                        }}
                  />
                  <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'leadsClosed') return [value, 'Total Closed'];
                          if (name === 'todayClosed') return [value, 'Closed Today'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Agent: ${label}`}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Bar 
                        dataKey="leadsClosed" 
                        name="Total Closed"
                        fill="url(#colorLeadsClosed)"
                        radius={[8, 8, 0, 0]}
                      >
                        {agentsData
                          .sort((a, b) => b.total_leads_closed - a.total_leads_closed)
                          .slice(0, 10)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.total_leads_closed > 0 ? '#10b981' : '#e5e7eb'} />
                          ))}
                      </Bar>
                      <defs>
                        <linearGradient id="colorLeadsClosed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                </BarChart>
                  </ResponsiveContainer>
                </div>
              </ComponentCard>

 

              {/* Second Row: Performance Score Distribution and Conversion Rate Trends Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Score Comparison - Area Chart */}
                <ComponentCard 
                  title="Performance Score Distribution" 
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-white/20 dark:border-gray-700/50 shadow-xl"
                >
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={agentsData
                          .sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
                          .slice(0, 10)
                          .map(agent => ({
                            name: agent.agent_name.length > 12 
                              ? agent.agent_name.substring(0, 12) + '...' 
                              : agent.agent_name,
                            fullName: agent.agent_name,
                            score: Number((agent.performance_score || 0).toFixed(1)),
                            conversionRate: Number((agent.conversion_rate || 0).toFixed(1))
                          }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <defs>
                          <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                          height={80}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          className="dark:text-gray-400"
                      />
                      <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          className="dark:text-gray-400"
                          domain={[0, 10]}
                      />
                      <Tooltip 
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                          formatter={(value: number) => [`${value}/10`, 'Performance Score']}
                          labelFormatter={(label) => `Agent: ${label}`}
                      />
                        <Area 
                        type="monotone" 
                          dataKey="score" 
                        stroke="#3b82f6" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorPerformance)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ComponentCard>

 

                {/* Conversion Rate Comparison - Line Chart */}
                <ComponentCard 
                  title="Conversion Rate Trends" 
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-white/20 dark:border-gray-700/50 shadow-xl"
                >
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={agentsData
                          .sort((a, b) => (b.conversion_rate || 0) - (a.conversion_rate || 0))
                          .slice(0, 10)
                          .map(agent => ({
                            name: agent.agent_name.length > 12 
                              ? agent.agent_name.substring(0, 12) + '...' 
                              : agent.agent_name,
                            fullName: agent.agent_name,
                            conversionRate: Number((agent.conversion_rate || 0).toFixed(1)),
                            leadsClosed: agent.total_leads_closed,
                            workload: agent.current_workload
                          }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          className="dark:text-gray-400"
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          className="dark:text-gray-400"
                          label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                        />
                      <Tooltip 
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                          formatter={(value: number) => [`${value}%`, 'Conversion Rate']}
                          labelFormatter={(label) => `Agent: ${label}`}
                      />
                      <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="conversionRate" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          dot={{ fill: '#8b5cf6', r: 5 }}
                          activeDot={{ r: 8 }}
                          name="Conversion Rate"
                        />
                      </LineChart>
              </ResponsiveContainer>
            </div>
        </ComponentCard>
              </div>
            </div>
          )}

 

          {/* Search and Filter Bar */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search agents by name or ID..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button 
                onClick={fetchAgentPerformance}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              </div>
                </div>

 

        {/* Agent Performance Table */}
          <ComponentCard 
            title="Detailed Performance Analysis" 
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-white/20 dark:border-gray-700/50 shadow-xl"
          >
          {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading agent performance data...</p>
            </div>
          ) : error ? (
              <div className="py-20 text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Data</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <button 
                onClick={fetchAgentPerformance}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
              </button>
            </div>
            ) : filteredAgents.length === 0 ? (
              <div className="py-20 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No Matching Agents" : "No Agent Data"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm 
                    ? "No agents match your search criteria. Try adjusting your search." 
                    : "No agent performance data available."}
                </p>
            </div>
          ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
              <div className="hidden lg:block max-w-full overflow-x-auto">
                  <div className="w-full">
                  <Table>
                      <TableHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <TableRow>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Rank</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-48">Agent</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-32">Department</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-32">Workload</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-32">Leads Closed</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-40">Conversion Rate</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-40">Performance Score</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAgents
                          .sort((a, b) => b.total_leads_closed - a.total_leads_closed)
                          .map((agent, index) => {
                          return (
                              <TableRow key={agent.agent_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300">
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center">
                                  {index < 3 ? (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        index === 0 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                                        'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                    }`}>
                                      <Trophy className="h-4 w-4" />
                                    </div>
                                  ) : (
                                    <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                                      {index + 1}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-[#1A73E8] flex items-center justify-center text-white font-semibold">
                                    {agent.agent_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                      <div className="font-medium text-gray-900 dark:text-white">{capitalizeFirstLetter(agent.agent_name)}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{agent.agent_id}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                    {agent.department}
                                  </span>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
                                    {agent.current_workload}
                                  </span>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700">
                                  {agent.total_leads_closed}
                                </span>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((agent.conversion_rate || 0), 100)}%` }}
                                    />
                                  </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[50px]">
                                      {(agent.conversion_rate || 0).toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-yellow-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(((agent.performance_score || 0) / 10) * 100, 100)}%` }}
                                      />
                                      </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[50px]">
                                      {(agent.performance_score || 0).toFixed(1)}/10
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>

 

              {/* Mobile/Tablet View */}
              <div className="lg:hidden">
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {filteredAgents
                      .sort((a, b) => b.total_leads_closed - a.total_leads_closed)
                      .map((agent, index) => (
                        <div 
                          key={agent.agent_id} 
                          className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {index < 3 ? (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                                  'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                  <Trophy className="h-5 w-5" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-400 flex-shrink-0">
                                  {index + 1}
                                </div>
                              )}
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                                {capitalizeFirstLetter(agent.agent_name)}
                              </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {agent.agent_id}
                              </p>
                            </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{agent.department}</p>
                                </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Workload</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{agent.current_workload}</p>
                              </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Leads Closed</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{agent.total_leads_closed}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Conversion Rate</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{(agent.conversion_rate || 0).toFixed(1)}%</p>
                                  </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Performance Score</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{(agent.performance_score || 0).toFixed(1)}/10</p>
                              </div>
                            </div>
                              </div>
                      ))}
                  </div>
                </div>
            </div>
          )}
        </ComponentCard>
        </div>
      </div>
    </div>
  );
}