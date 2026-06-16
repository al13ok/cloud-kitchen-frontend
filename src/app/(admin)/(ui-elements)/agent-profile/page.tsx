'use client';

import React, { useState, useEffect, useRef } from "react";
import DashboardHeader from "@/components/header/DashboardHeader";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { User, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import EditAgentProfileModal from "@/components/EditAgentProfileModal";

import { BACKEND_URL, getAuthHeaders, fetchWithTimeout } from '@/utils/api';

// Agent Profile interface
interface AgentProfile {
  id?: string;
  agent_id?: string;
  userId?: string;
  agentName?: string;
  agent_name?: string;
  agentEmail?: string;
  agent_email?: string;
  department: string;
  skills?: string[];
  interestCategories?: string[];
  interest_categories?: string[];
  maxDailyLeads?: number;
  max_daily_leads?: number;
  maxConcurrentLeads?: number;
  max_concurrent_leads?: number;
  currentWorkload?: number;
  current_workload?: number;
  performanceScore?: number;
  performance_score?: number;
  conversionRate?: number;
  conversion_rate?: number;
  avgResponseTime?: number;
  avg_response_time?: number;
  status?: 'available' | 'busy' | 'away' | 'offline' | string;
  timezone?: string;
  workingHours?: Record<string, unknown>;
  working_hours?: Record<string, unknown>;
  preferredAssignmentMethod?: string;
  preferred_assignment_method?: string;
  excludeSources?: string[];
  exclude_sources?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Agent Performance interface (merged with agent profile data)
interface AgentPerformance {
  agent_id: string;
  id?: string; // Add optional id for compatibility
  agentId?: string; // Add optional agentId for compatibility
  agent_name: string;
  agentName?: string; // Add optional agentName for compatibility
  agent_email?: string; // Add optional agent_email for compatibility
  agentEmail?: string; // Add optional agentEmail for compatibility
  status?: string; // Add optional status for compatibility
  department: string;
  current_workload: number;
  total_leads_closed: number;
  today_leads_closed: number;
  today_leads_assigned: number;
  // Additional performance metrics
  totalLeads?: number;
  convertedLeads?: number;
  conversionRate?: number;
  avgResponseTime?: number;
  totalRevenue?: number;
  avgDealSize?: number;
  leadsThisMonth?: number;
  leadsLastMonth?: number;
  conversionRateChange?: number;
  responseTimeChange?: number;
  revenueChange?: number;
  topPerformingSources?: Array<{
    source: string;
    count: number;
    conversionRate: number;
  }>;
  monthlyPerformance?: Array<{
    month: string;
    leads: number;
    conversions: number;
    revenue: number;
  }>;
}


interface User {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  userRoles?: string;
  status?: string;
}

export default function AgentProfilePage() {
  const [agentsData, setAgentsData] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Helper function to capitalize first letter of each word in agent name
  const capitalizeAgentName = (name: string): string => {
    if (!name || typeof name !== 'string') return name || '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<{agent_id: string, agent_name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);
  const [showAssignAgentModal, setShowAssignAgentModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [, setIsUpdating] = useState(false);
  const hasFetchedData = useRef(false);

  useEffect(() => {
    if (!hasFetchedData.current) {
      fetchAgentProfiles();
      hasFetchedData.current = true;
    }
    const refreshOnClose = (e: Event) => {
      try {
        const custom = e as CustomEvent<{ agentId?: string }>;
        const closedAgentId = custom.detail?.agentId;
        if (closedAgentId) {
          setAgentsData(prev => prev.map(a => a.agent_id === closedAgentId
            ? {
              ...a,
              // Workload decrease by 1 when lead closes? Requirement says increase by 1; applying as requested
              current_workload: (a.current_workload || 0) + 1,
              total_leads_closed: (a.total_leads_closed || 0) + 1,
              today_leads_closed: (a.today_leads_closed || 0) + 1,
            }
            : a
          ));
        }
      } catch {}
      fetchAgentProfiles();
    };
    window.addEventListener('lead-closed', refreshOnClose as EventListener);
    return () => window.removeEventListener('lead-closed', refreshOnClose as EventListener);
  }, []);

  const fetchAgentProfiles = async () => {
    try {
      setLoading(true);
      console.log('Fetching agent profiles...');
      
      const authHeaders = getAuthHeaders();
      
      // Try to fetch agent profiles - try multiple endpoints with fallback
      interface ProfileDataItem {
        agent_id?: string;
        agent_name?: string;
        name?: string;
        department?: string;
        current_workload?: number;
        [key: string]: unknown;
      }
      let profileData: ProfileDataItem[] = [];
      let fetched = false;
      
      // First try: /api/v1/agents (from leads_integration router)
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
        } else {
          console.log(`⚠️ /api/v1/agents returned ${response1.status}`);
        }
      } catch (e) {
        console.log('⚠️ /api/v1/agents failed:', e);
      }
      
      // Fallback: try /api/v1/lead-assignment/agent-profiles if first didn't work
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
          } else {
            console.log(`⚠️ /api/v1/lead-assignment/agent-profiles returned ${response2.status}`);
          }
        } catch (e) {
          console.log('⚠️ /api/v1/lead-assignment/agent-profiles failed:', e);
        }
      }
      
      // If still no data, show empty state (don't throw error)
      if (!profileData || profileData.length === 0) {
        console.log('ℹ️ No agent profiles found - showing empty state');
        setAgentsData([]);
        setError(null); // Don't show error if no agents found
        setLoading(false);
        return;
      }
      
      // Fetch agent performance data (optional - don't fail if this fails)
      interface PerformanceData {
        agent_id?: string;
        total_leads_closed?: number;
        [key: string]: unknown;
      }
      let performanceData: PerformanceData[] = [];
      try {
        const performanceResponse = await fetchWithTimeout(
          `${BACKEND_URL}/api/v1/lead-performance/agents?t=${Date.now()}`,
          {
            method: 'GET',
            headers: authHeaders,
            cache: 'no-store',
            timeoutMs: 10000,
          }
        );
        if (performanceResponse.ok) {
          performanceData = await performanceResponse.json();
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch performance data:', e);
      }
      
      // Fetch daily performance summary (optional - don't fail if this fails)
      let dailyPerformance: Record<string, number> = {};
      let dailyAssigned: Record<string, number> = {};
      try {
        const dailySummaryResponse = await fetchWithTimeout(
          `${BACKEND_URL}/api/v1/lead-performance/daily-summary?t=${Date.now()}`,
          {
            method: 'GET',
            headers: authHeaders,
            cache: 'no-store',
            timeoutMs: 10000,
          }
        );
        if (dailySummaryResponse.ok) {
          const dailySummaryData = await dailySummaryResponse.json();
          dailyPerformance = dailySummaryData.summary?.agent_performance || {};
          dailyAssigned = dailySummaryData.summary?.agent_assigned_today || {};
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch daily summary:', e);
      }
      
      // Merge the data
      const mergedData: AgentPerformance[] = profileData
        .filter((profile) => profile.agent_id) // Filter out profiles without agent_id
        .map((profile) => {
          const agentId = String(profile.agent_id!); // We know it exists due to filter
          const performance = performanceData.find((perf: PerformanceData) => perf.agent_id === agentId);
          const todayLeadsClosed = dailyPerformance[agentId] || 0;
          const todayAssigned = dailyAssigned[agentId] || 0;
          return {
            agent_id: agentId,
            agent_name: String(profile.agent_name || profile.name || 'Unknown'),
            department: String(profile.department || 'General'),
            current_workload: Number(profile.current_workload || 0),
            total_leads_closed: performance?.total_leads_closed || 0,
            today_leads_closed: todayLeadsClosed,
            today_leads_assigned: todayAssigned
          };
        });
      
      setAgentsData(mergedData);
      setError(null);
    } catch (err) {
      console.error("Error fetching agent data:", err);
      // Don't show error - just show empty state
      setError(null);
      setAgentsData([]);
    } finally {
      setLoading(false);
    }
  };




  const handleDeleteAgent = (agent_id: string, agent_name: string) => {
    setAgentToDelete({ agent_id, agent_name });
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;
    
    setIsDeleting(true);
    try {
      const authHeaders = getAuthHeaders();
      
      // Try /api/v1/lead-assignment/agent-profiles first, fallback to /api/v1/agents
      let response = await fetchWithTimeout(
        `${BACKEND_URL}/api/v1/lead-assignment/agent-profiles/${agentToDelete.agent_id}`,
        {
          method: "DELETE",
          headers: authHeaders,
          timeoutMs: 10000,
        }
      );
      
      if (!response.ok && response.status === 404) {
        // Try alternative endpoint
        response = await fetchWithTimeout(
          `${BACKEND_URL}/api/v1/agents/${agentToDelete.agent_id}`,
          {
            method: "DELETE",
            headers: authHeaders,
            timeoutMs: 10000,
          }
        );
      }
      
      if (!response.ok) {
        throw new Error(`Failed to delete agent profile (Error ${response.status})`);
      }
      
      // Refresh the agent data
      fetchAgentProfiles();
      
      // Show success message
      alert(`Agent profile for ${agentToDelete.agent_name} deleted successfully!`);
    } catch (err) {
      console.error("Error deleting agent profile:", err);
      alert(err instanceof Error ? err.message : "Failed to delete agent profile. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
      setAgentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setAgentToDelete(null);
  };

  const handleEditAgent = async (agent: AgentPerformance) => {
    try {
      const authHeaders = getAuthHeaders();
      
      // Try multiple endpoints to fetch agent profile
      interface AgentProfileResponse {
        agent_id?: string;
        agent_name?: string;
        agent_email?: string;
        department?: string;
        [key: string]: unknown;
      }
      let response: Response;
      let agentProfile: AgentProfileResponse | null = null;
      
      // First try: /api/v1/agents/{agent_id}
      try {
        response = await fetchWithTimeout(
          `${BACKEND_URL}/api/v1/agents/${agent.agent_id}`,
          {
            method: 'GET',
            headers: authHeaders,
            timeoutMs: 10000,
          }
        );
        if (response.ok) {
          const data = await response.json();
          agentProfile = data.agent || data;
        } else {
          throw new Error(`API returned ${response.status}`);
        }
      } catch {
        // Fallback to /api/v1/lead-assignment/agent-profiles
        try {
          response = await fetchWithTimeout(
            `${BACKEND_URL}/api/v1/lead-assignment/agent-profiles?agentId=${agent.agent_id}`,
            {
              method: 'GET',
              headers: authHeaders,
              timeoutMs: 10000,
            }
          );
          
          if (response.ok) {
            const agentProfiles = await response.json();
            agentProfile = Array.isArray(agentProfiles) 
              ? agentProfiles.find((p: AgentProfileResponse) => p.agent_id === agent.agent_id) || null
              : (agentProfiles as AgentProfileResponse);
          } else {
            throw new Error(`Failed to fetch agent profile: ${response.status}`);
          }
        } catch (fallbackErr) {
          throw new Error(`Failed to fetch agent profile from both endpoints. Last error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
        }
      }
      
      if (!agentProfile) {
        throw new Error("Agent profile not found");
      }

      // Convert AgentProfileResponse to AgentPerformance
      const agentPerformance: AgentPerformance = {
        agent_id: agentProfile.agent_id || agent.agent_id,
        agent_name: agentProfile.agent_name || agent.agent_name || 'Unknown',
        department: agentProfile.department || agent.department || 'General',
        current_workload: agent.current_workload || 0,
        total_leads_closed: agent.total_leads_closed || 0,
        today_leads_closed: agent.today_leads_closed || 0,
        today_leads_assigned: agent.today_leads_assigned || 0,
        // Include any additional properties from agentProfile
        ...(agentProfile as Record<string, unknown>)
      };

      setSelectedAgent(agentPerformance);
      setShowEditModal(true);
    } catch (err) {
      console.error("Error fetching agent profile:", err);
      alert(err instanceof Error ? err.message : "Failed to fetch agent profile");
    }
  };

  // Fetch users for assignment
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      
      // Try using BACKEND_URL directly (same as controls-users page which works)
      // If that fails, fallback to relative path (Next.js proxy)
      let url = `${BACKEND_URL}/api/v1/users?online_only=false&include_offline=true`;
      let useProxy = false;
      
      console.log('Fetching users from:', url);
      
      let response: Response;
      
      // First try: Direct backend URL
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          response = await fetch(url, {
            method: 'GET',
            headers: authHeaders,
            credentials: 'include',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      } catch (err) {
        console.warn('Direct backend URL failed, trying Next.js proxy:', err);
        
        // Fallback: Try Next.js rewrite proxy
        url = `/api/v1/users?online_only=false&include_offline=true`;
        useProxy = true;
        
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        
        try {
          response = await fetch(url, {
            method: 'GET',
            headers: authHeaders,
            credentials: 'include',
            signal: controller2.signal,
          });
          clearTimeout(timeoutId2);
          console.log('Successfully fetched using Next.js proxy');
        } catch (proxyErr) {
          clearTimeout(timeoutId2);
          
          // Handle abort (timeout)
          if (proxyErr instanceof Error && proxyErr.name === 'AbortError') {
            throw new Error('Request timed out. Please check your network connection and try again.');
          }
          
          // Re-throw network errors with better message
          if (proxyErr instanceof TypeError && proxyErr.message.includes('fetch')) {
            throw new Error(`Network error: Unable to connect to the API. Please check your internet connection and ensure the backend server is running at ${BACKEND_URL}.`);
          }
          
          throw proxyErr;
        }
      }
      
      if (!response.ok) {
        console.error('Failed to fetch users:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Error response:', errorText);
        setUsers([]);
        setUsersLoading(false);
        return;
      }
      
      interface UsersApiResponse {
        users?: User[];
        data?: User[];
        [key: string]: unknown;
      }
      let data: UsersApiResponse | User[];
      try {
        data = await response.json() as UsersApiResponse | User[];
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        const textResponse = await response.text();
        console.error('Response text:', textResponse);
        setUsers([]);
        setUsersLoading(false);
        return;
      }
      
      console.log('Fetched users from API:', data?.length || 0, 'users', useProxy ? '(via proxy)' : '(direct)');
      console.log('Response data type:', typeof data, 'Is array:', Array.isArray(data));
      
      // Handle different response formats
      interface UserApiItem {
        id?: string;
        _id?: string;
        fullName?: string;
        full_name?: string;
        name?: string;
        email?: string;
        mobile?: string;
        phone?: string;
        userRoles?: string;
        roles?: string;
        role?: string;
        status?: string;
        loginFlag?: string;
        [key: string]: unknown;
      }
      let usersArray: UserApiItem[] = [];
      if (Array.isArray(data)) {
        usersArray = data as UserApiItem[];
      } else if (data && Array.isArray(data.users)) {
        usersArray = data.users as UserApiItem[];
      } else if (data && Array.isArray(data.data)) {
        usersArray = data.data as UserApiItem[];
      } else if (data && typeof data === 'object') {
        // If it's an object with user data, try to extract
        console.warn('Unexpected response format:', data);
        usersArray = [];
      } else {
        console.error('Users API did not return an array or expected object format:', data);
        setUsers([]);
        setUsersLoading(false);
        return;
      }
      
      if (usersArray.length === 0) {
        console.log('No users found in database');
        setUsers([]);
        setUsersLoading(false);
        return;
      }
      
      console.log('Processing', usersArray.length, 'users from API');
      
      // Filter out users who already have agent profiles
      // Check by email match (case-insensitive)
      
      // Also check by fetching agent profiles with email if available
      const agentEmailSet = new Set<string>();
      try {
        // Try to get agent profiles with emails (use Next.js rewrite proxy)
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        
        let agentProfilesResponse: Response;
        try {
          agentProfilesResponse = await fetch('/api/v1/lead-assignment/agent-profiles', {
            method: 'GET',
            headers: authHeaders,
            credentials: 'include',
            signal: controller2.signal,
          });
          clearTimeout(timeoutId2);
        } catch (fetchError) {
          clearTimeout(timeoutId2);
          throw fetchError;
        }
        if (agentProfilesResponse.ok) {
          interface AgentProfileEmail {
            agent_email?: string;
            [key: string]: unknown;
          }
          const agentProfiles = await agentProfilesResponse.json() as AgentProfileEmail[] | { agents?: AgentProfileEmail[] };
          const profilesArray = Array.isArray(agentProfiles) ? agentProfiles : (agentProfiles.agents || []);
          profilesArray.forEach((agent: AgentProfileEmail) => {
            if (agent.agent_email) {
              agentEmailSet.add(agent.agent_email.toLowerCase());
            }
          });
        }
      } catch (e) {
        console.warn('Could not fetch agent profiles for email filtering:', e);
      }
      
      // Map and filter users
      const mappedUsers: User[] = usersArray
        .map((user: UserApiItem) => ({
          id: user.id || user._id || String(user.id || user._id || ''),
          fullName: user.fullName || user.full_name || user.name || '',
          email: user.email || '',
          mobile: user.mobile || user.phone || '',
          userRoles: user.userRoles || user.roles || user.role || '',
          status: user.status || user.loginFlag || 'active',
        }))
        .filter((user: User) => {
          // Skip users without email (required for agent profile)
          if (!user.email || !user.email.trim()) {
            return false;
          }
          
          // Skip users who already have an agent profile by email
          if (agentEmailSet.has(user.email.toLowerCase())) {
            return false;
          }
          
          // Skip if user's fullName matches any agent name (case-insensitive)
          const userNameLower = user.fullName?.toLowerCase() || '';
          const hasMatchingAgentName = agentsData.some(a => {
            const agentNameLower = a.agent_name?.toLowerCase() || '';
            return agentNameLower && userNameLower && agentNameLower === userNameLower;
          });
          
          if (hasMatchingAgentName) {
            return false;
          }
          
          return true;
        });
      
      console.log('Filtered users (excluding existing agents):', mappedUsers.length, 'available');
      console.log('Sample user data:', mappedUsers.slice(0, 2));
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to fetch users. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('aborted')) {
          errorMessage = 'Request timed out. Please check your network connection and try again.';
        } else if (error.message.includes('Network error') || error.message.includes('Unable to connect')) {
          errorMessage = error.message;
        } else if (error.message.includes('Invalid URL')) {
          errorMessage = 'Backend URL is not configured. Please check your environment variables.';
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof TypeError) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and ensure the backend server is running.';
        }
      }
      
      console.error('Detailed error:', errorMessage);
      
      // Only show alert for critical errors, not for expected failures
      if (!errorMessage.includes('timeout') && !errorMessage.includes('Network error')) {
        // For less critical errors, just log and set empty array
        console.warn('Non-critical error fetching users:', errorMessage);
      } else {
        alert(errorMessage);
      }
      
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Open assign agent modal and fetch users
  const handleAssignAgent = () => {
    setShowAssignAgentModal(true);
    setUserSearchTerm("");
    setSelectedUser(null);
    fetchUsers();
  };

  // Handle user selection - pre-fill form and show edit modal
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowAssignAgentModal(false);
    
    // Convert to format expected by EditAgentProfileModal
    const agentForModal: AgentPerformance = {
      agent_id: '',
      agent_name: user.fullName,
      agent_email: user.email,
      department: user.userRoles?.includes('Sales') ? 'Sales' : 'General',
      current_workload: 0,
      total_leads_closed: 0,
      today_leads_closed: 0,
      today_leads_assigned: 0,
      // Additional optional properties
      skills: [],
      interest_categories: [],
      max_daily_leads: 10,
      max_concurrent_leads: 25,
      performance_score: 5.0,
      conversion_rate: 0.0,
      avg_response_time: 0.0,
      status: 'available',
      timezone: 'UTC',
      working_hours: {},
      preferred_assignment_method: 'round_robin',
      exclude_sources: [],
    } as AgentPerformance;
    
    setSelectedAgent(agentForModal);
    setShowEditModal(true);
  };

  const handleSaveAgentProfile = async (updatedProfile: Partial<AgentProfile>): Promise<void> => {
    setIsUpdating(true);
    try {
      // Get agent data from selectedAgent or updatedProfile
      const isNewAgent = !selectedAgent?.agent_id || selectedAgent.agent_id === '';
      const agentId = isNewAgent ? '' : (selectedAgent?.agent_id || selectedAgent?.id || selectedAgent?.agentId || '');
      // Get agent name and email from updatedProfile first (user may have edited), then fallback to selectedAgent or selectedUser
      const agentName = updatedProfile.agentName || updatedProfile.agent_name || selectedAgent?.agent_name || selectedAgent?.agentName || selectedUser?.fullName || '';
      const agentEmail = updatedProfile.agentEmail || updatedProfile.agent_email || selectedAgent?.agent_email || selectedAgent?.agentEmail || selectedUser?.email || '';
      const department = updatedProfile.department || selectedAgent?.department || (selectedUser?.userRoles?.includes('Sales') ? 'Sales' : 'General') || '';

      // Validate required fields
      if (!agentName || agentName.trim() === '') {
        throw new Error("Agent name is required");
      }
      if (!agentEmail || agentEmail.trim() === '') {
        throw new Error("Agent email is required");
      }
      if (!department || department.trim() === '') {
        throw new Error("Department is required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(agentEmail)) {
        throw new Error("Invalid email format");
      }

      // Ensure status is a valid value
      const validStatuses: string[] = ['available', 'busy', 'offline', 'away'];
      const statusValue = updatedProfile.status || selectedAgent?.status || 'available';
      const statusStr = typeof statusValue === 'string' ? statusValue : String(statusValue);
      const finalStatus: 'available' | 'busy' | 'offline' | 'away' = (validStatuses.includes(statusStr.toLowerCase()) 
        ? statusStr.toLowerCase() 
        : 'available') as 'available' | 'busy' | 'offline' | 'away';

      // Map frontend fields to backend expected format
      // For new agents, leave agent_id empty so backend generates it
      interface AgentProfilePayload {
        agent_id?: string;
        agent_name: string;
        agent_email: string;
        department: string;
        skills: string[];
        interest_categories: string[];
        max_daily_leads: number;
        max_concurrent_leads: number;
        current_workload: number;
        performance_score: number;
        conversion_rate: number;
        avg_response_time: number;
        status: 'available' | 'busy' | 'offline' | 'away';
        working_hours: Record<string, unknown>;
        timezone: string;
        preferred_assignment_method: string | null;
        exclude_sources: string[];
        created_by: string;
        user_id?: string;
        employee_id?: string;
      }
      const payload: AgentProfilePayload = {
        agent_name: agentName.trim(),
        agent_email: agentEmail.trim(),
        department: department.trim(),
        skills: Array.isArray(updatedProfile.skills) ? updatedProfile.skills : [],
        interest_categories: Array.isArray(updatedProfile.interestCategories)
          ? updatedProfile.interestCategories 
          : (Array.isArray(updatedProfile.interest_categories) ? updatedProfile.interest_categories : []),
        max_daily_leads: Number(updatedProfile.maxDailyLeads ?? updatedProfile.max_daily_leads ?? 10),
        max_concurrent_leads: Number(updatedProfile.maxConcurrentLeads ?? updatedProfile.max_concurrent_leads ?? 25),
        current_workload: Number(updatedProfile.currentWorkload ?? updatedProfile.current_workload ?? 0),
        performance_score: Number(updatedProfile.performanceScore ?? updatedProfile.performance_score ?? 5.0),
        conversion_rate: Number(updatedProfile.conversionRate ?? updatedProfile.conversion_rate ?? 0.0),
        avg_response_time: Number(updatedProfile.avgResponseTime ?? updatedProfile.avg_response_time ?? 0.0),
        status: finalStatus,
        working_hours: updatedProfile.workingHours || updatedProfile.working_hours || {},
        timezone: (updatedProfile.timezone || 'UTC').toString(),
        preferred_assignment_method: updatedProfile.preferredAssignmentMethod || updatedProfile.preferred_assignment_method || null,
        exclude_sources: Array.isArray(updatedProfile.excludeSources) 
          ? updatedProfile.excludeSources 
          : (Array.isArray(updatedProfile.exclude_sources) ? updatedProfile.exclude_sources : []),
        created_by: updatedProfile.createdBy || 'system'
      };

      // Only include agent_id if it's an update (not a new agent)
      if (!isNewAgent && agentId && agentId.trim() !== '') {
        payload.agent_id = agentId.toString().trim();
      } else if (selectedUser?.id) {
        // Link to user ID if this is a new agent from user selection
        payload.user_id = selectedUser.id;
        payload.employee_id = selectedUser.id;
      }

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const authHeaders = getAuthHeaders();
      
      // POST /api/v1/lead-assignment/agent-profiles (this endpoint handles both create and update)
      const response = await fetchWithTimeout(
        `${BACKEND_URL}/api/v1/lead-assignment/agent-profiles`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
          timeoutMs: 10000,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        console.error('Error response:', errorData);
        const errorMessage = errorData.detail 
          ? (Array.isArray(errorData.detail) ? errorData.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', ') : errorData.detail)
          : `HTTP ${response.status}`;
        throw new Error(`Failed to ${isNewAgent ? 'create' : 'update'} agent profile: ${errorMessage}`);
      }

      const result = await response.json();
      console.log('Success response:', result);

      // Refresh the agent data
      await fetchAgentProfiles();
      alert(isNewAgent ? `Agent profile created successfully! Agent ID: ${result.agent_id}` : 'Agent profile updated successfully!');
      
      // Close modals
      setShowEditModal(false);
      setSelectedAgent(null);
      setSelectedUser(null);
    } catch (err) {
      console.error("Error saving agent profile:", err);
      alert(err instanceof Error ? err.message : `Failed to ${selectedAgent?.agent_id ? 'update' : 'create'} agent profile`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedAgent(null);
    setSelectedUser(null);
  };

  const filteredAgents = agentsData.filter(agent => {
    const matchesSearch = agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          agent.agent_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-4 md:mx-6 pt-6">
        <DashboardHeader
          variant="default"
          size="lg"
          title="Agent Profiles"
          subtitle="Comprehensive agent management with advanced performance tracking, workload monitoring, and intelligent assignment capabilities • Enterprise Workspace"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Agent Profiles", href: "/agent-profile" }
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
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
              <path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" />
            </svg>
          )}
        />
      </div>

      <div className="relative mt-6 sm:mt-8 z-10">
        <div className="px-4 sm:px-6 space-y-6 sm:space-y-8">
          {/* Enhanced Action Bar */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Manage agent profiles and assign users as agents
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Click &quot;Assign Agent&quot; to select a user and create their agent profile
                </p>
              </div>
            </div>
          </div>
          
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>{filteredAgents.length} Active Agents</span>
                </div>
              </div>
              
              {/* Assign Agent Button */}
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleAssignAgent}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                  Assign Agent
                </Button>
              </div>
              
              {/* Enhanced Search */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                    placeholder="Search agents by name or ID..."
                    className="pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white bg-white/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/70 dark:hover:bg-gray-600/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
              </div>
          </div>
        </div>

          {/* Enhanced Agent Profiles Table */}
          <ComponentCard 
            title="Agent Profiles" 
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-white/20 dark:border-gray-700/50 shadow-xl"
          >
          {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading agent profiles...</p>
            </div>
          ) : error ? (
              <div className="py-20 text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <div className="text-red-600 dark:text-red-400 text-2xl">⚠️</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Data</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <button 
                onClick={fetchAgentProfiles}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                  Try Again
              </button>
            </div>
          ) : filteredAgents.length === 0 ? (
              <div className="py-20 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No Matching Agents" : "No Agent Profiles"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm 
                    ? "No agents match your search criteria. Try adjusting your search." 
                    : "No agent profiles have been created yet. Create your first agent profile to get started."}
                </p>
              <button
                onClick={handleAssignAgent}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                  <Plus className="h-4 w-4 mr-2" />
                Assign Agent
              </button>
            </div>
          ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
              <div className="hidden lg:block max-w-full overflow-x-hidden">
                  <div className="w-full">
                  <Table>
                      <TableHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <TableRow>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Agent ID</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-48">Agent Name</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-32">Department</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-32">Workload</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-32">Actions</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((agent) => (
                          <TableRow key={agent.agent_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer">
                            <TableCell className="px-6 py-4 text-sm md:text-base">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-[#1A73E8] flex items-center justify-center text-white font-semibold text-sm">
                                  {agent.agent_id.slice(-2)}
                                </div>
                                <span className="ml-3 text-gray-900 dark:text-white font-medium">
                            {agent.agent_id}
                                </span>
                              </div>
                          </TableCell>
                            <TableCell className="px-6 py-4 text-sm md:text-base">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-[#1A73E8] flex items-center justify-center text-white font-semibold">
                                  {agent.agent_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white text-sm md:text-base">{capitalizeAgentName(agent.agent_name)}</div>
                                </div>
                              </div>
                          </TableCell>
                            <TableCell className="px-6 py-4 text-sm md:text-base">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {agent.department}
                              </span>
                          </TableCell>
                            <TableCell className="px-6 py-4 text-sm md:text-base">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
                              {agent.current_workload}
                            </span>
                          </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditAgent(agent)}
                                  aria-label="Edit agent"
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAgent(agent.agent_id, agent.agent_name)}
                                  aria-label="Delete agent"
                                  disabled={isDeleting}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

                {/* Enhanced Mobile/Tablet View */}
              <div className="lg:hidden">
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {filteredAgents.map((agent) => (
                    <div 
                      key={agent.agent_id} 
                        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-pointer"
                      >
                        <div className="mb-4">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-12 h-12 rounded-full bg-[#1A73E8] flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                              {agent.agent_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">
                            {capitalizeAgentName(agent.agent_name)}
                          </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {agent.agent_id}
                          </p>
                        </div>
                          </div>
                          <div className="mt-3">
                            <span className="inline-flex justify-center items-center px-2.5 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
                            Workload: {agent.current_workload}
                          </span>
                        </div>
                      </div>
                      
                        <div className="space-y-3 mb-4 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Department</span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 max-w-[65%] truncate">
                              {agent.department}
                            </span>
                          </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditAgent(agent)}
                          aria-label="Edit agent"
                          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAgent(agent.agent_id, agent.agent_name)}
                          aria-label="Delete agent"
                          disabled={isDeleting}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ComponentCard>
      </div>

      
      {/* Enhanced Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteConfirmation} 
        onClose={cancelDelete}
        className="max-w-md"
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <div className="text-red-600 dark:text-red-400 text-xl">⚠️</div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Deletion</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
            </div>
          </div>
          
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Are you sure you want to delete the agent profile for <strong className="text-red-600 dark:text-red-400">{agentToDelete?.agent_name}</strong>? 
            This will permanently remove all associated data and cannot be undone.
          </p>
          
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={cancelDelete}
              type="button"
              disabled={isDeleting}
              className="px-6 py-3 rounded-xl hover:scale-105 transition-all duration-300"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteAgent}
              disabled={isDeleting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {isDeleting ? "Deleting..." : "Delete Agent"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Agent Modal - User Selection */}
      <Modal 
        isOpen={showAssignAgentModal} 
        onClose={() => {
          setShowAssignAgentModal(false);
          setUserSearchTerm("");
          setSelectedUser(null);
        }}
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Assign Agent</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select a user to assign as an agent. Their details will be pre-filled in the agent form.
              </p>
            </div>
            <button
              onClick={() => {
                setShowAssignAgentModal(false);
                setUserSearchTerm("");
                setSelectedUser(null);
              }}
              className="ml-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Search */}
          <div className="mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Users List - Scrollable */}
          <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg min-h-0 max-h-[60vh]">
            {usersLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No users available</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {usersLoading ? 'Loading...' : 'All users may already have agent profiles, or no users exist in the system.'}
                </p>
                <button
                  onClick={fetchUsers}
                  className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {users
                  .filter(user => 
                    userSearchTerm === '' || 
                    user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                  )
                  .map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#1A73E8] flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate">{user.fullName}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</div>
                            {user.mobile && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">{user.mobile}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                          {user.userRoles && (
                            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                              {user.userRoles}
                            </span>
                          )}
                          <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            Select
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              setShowAssignAgentModal(false);
              setUserSearchTerm("");
              setSelectedUser(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Edit Agent Profile Modal */}
      <EditAgentProfileModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        agentProfile={selectedAgent as AgentPerformance}
        onSave={handleSaveAgentProfile}
      />
      </div>
    </div>
  );
}
