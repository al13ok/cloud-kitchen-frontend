'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Download,
  RefreshCw,
  MessageSquare,
  Loader2,
  AlertCircle,
  ChevronDown,
  UserPlus,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/form/input/InputField';
import Select from '@/components/form/Select';
import Button from '@/components/ui/button/Button';
import Pagination from '@/components/tables/Pagination';
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table';
import ComponentCard from '@/components/common/ComponentCard';
import { Ticket, User } from '@/types/servicedesk';
import { getAuthHeaders, BACKEND_URL } from '@/utils/api';
import { safeParseDate } from '@/utils/timeUtils';
import * as XLSX from 'xlsx';
import DashboardHeader from '@/components/header/DashboardHeader';

type EnrichedTicket = Ticket & {
  email?: string;
  mobile?: string;
  issue_type?: string;
  severity?: string;
};

export default function AdminTicketManagementPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<EnrichedTicket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'priority' | 'status' | 'updated_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchField, setSearchField] = useState<'all' | 'ticket_id' | 'subject' | 'requester' | 'description'>('all');

  // Store ticket type map and ID mapping to track customer vs employee tickets
  const [ticketIdMap, setTicketIdMap] = useState<Record<string, { mongoId: string; ticketId?: string }>>({});

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [assigningTickets, setAssigningTickets] = useState(false);

  // Close ticket modal state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<string | null>(null);
  const [closingTicket, setClosingTicket] = useState(false);

  // Escalation modal state
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [ticketToEscalate, setTicketToEscalate] = useState<string | null>(null);
  const [escalatingTicket, setEscalatingTicket] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [escalationReason, setEscalationReason] = useState<string>('');

  // Export menu state
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Real-time timer for SLA tracking
  const [now, setNow] = useState<number>(Date.now());

  const {
    isAgentUser,
    canManageTickets,
    agentIdentifiers
  } = useMemo(() => {
    const normalizeToken = (value?: unknown) =>
      (value ?? '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

    const tokens = new Set<string>();
    const collect = (value: unknown) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        value.forEach(collect);
        return;
      }
      if (typeof value === 'object') {
        const maybeRoleName = (value as Record<string, unknown>).role_name;
        if (typeof maybeRoleName === 'string') {
          tokens.add(normalizeToken(maybeRoleName));
        }
        return;
      }
      tokens.add(normalizeToken(value));
    };

    type RawAuthUser = Partial<User> & Record<string, unknown>;
    const rawUser = (user ?? null) as RawAuthUser | null;
    if (rawUser) {
      [
        rawUser.role,
        rawUser.role_name,
        rawUser.roleId,
        rawUser.role_id,
        rawUser.userRoles,
        rawUser.roles,
        rawUser.roleIds,
        rawUser.login_flag
      ].forEach(collect);
    }

    const containsAny = (predicates: string[]) =>
      Array.from(tokens).some(token =>
        predicates.some(predicate => token.includes(predicate))
      );

    const roleIdsValue = rawUser?.roleIds;
    const firstRoleId = Array.isArray(roleIdsValue) ? roleIdsValue[0] : roleIdsValue;
    const roleIdRaw =
      rawUser?.role_id ??
      rawUser?.roleId ??
      firstRoleId;
    const roleIdNormalized = normalizeToken(roleIdRaw);

    const isAdminRole =
      containsAny(['super_admin', 'superadmin', 'admin', 'administrator']) ||
      ['1', '01', '001', 'admin', 'administrator', 'super_admin', 'superadmin'].includes(roleIdNormalized);

    const isAgentRoleExplicit =
      containsAny(['agent', 'support_agent', 'sales_agent', 'field_agent', 'sales']) ||
      ['2', '3', '4', 'agent', 'sales', 'sales_agent', 'support_agent'].includes(roleIdNormalized);
    const isAgentUser = Boolean(isAgentRoleExplicit && !isAdminRole);

    const canManageTickets = !isAgentUser;

    const normalizedIdentifiers = {
      id: normalizeToken(rawUser?.user_id ?? rawUser?.id),
      email: normalizeToken(rawUser?.email),
      name: normalizeToken(rawUser?.full_name ?? rawUser?.name),
    };

    return {
      isAgentUser,
      canManageTickets,
      agentIdentifiers: isAgentUser ? normalizedIdentifiers : { id: '', email: '', name: '' }
    };
  }, [user]);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60000); // Update every minute
    return () => clearInterval(intervalId);
  }, []);

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Transform backend ticket to frontend Ticket format (same as dashboard)
  const transformTicket = (ticket: Record<string, unknown>): EnrichedTicket => {
    let priority: Ticket['priority'] = 'medium';
    const severityRaw = ticket.severity;
    const severity = typeof severityRaw === 'string' ? severityRaw.toLowerCase() : 'unknown';
    const score = typeof ticket.score === 'number' ? ticket.score : 0;
    if (severity.includes('critical') || severity.includes('urgent') || score >= 80) {
      priority = 'urgent';
    } else if (severity.includes('high') || score >= 60) {
      priority = 'high';
    } else if (severity.includes('low') || score <= 30) {
      priority = 'low';
    }

    const statusRaw = ticket.status;
    let status = (typeof statusRaw === 'string' ? statusRaw : 'open').toLowerCase().replace(/ /g, '_');
    if (!['open', 'pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
      status = 'open';
    }

    // Use issue as subject, issue_type + issue as description
    const issueStr = typeof ticket.issue === 'string' ? ticket.issue : '';
    const messageStr = typeof ticket.message === 'string' ? ticket.message : '';
    const issueTypeStr = typeof ticket.issue_type === 'string' ? ticket.issue_type : '';
    const subject = issueStr || (messageStr ? messageStr.substring(0, 50) : '') || 'No subject';
    const description = messageStr || `${issueTypeStr} - ${issueStr}`.trim() || 'No description';

    // Format dates using safe utility function
    const created_at = safeParseDate(ticket.created_at);
    const updated_at_raw = ticket.updated_at || ticket.modified_at || ticket.created_at;
    const updated_at = updated_at_raw ? safeParseDate(updated_at_raw, new Date(created_at)) : created_at;

    // Get ticket number with proper type guards
    const displayId = typeof ticket.display_id === 'string' ? ticket.display_id : '';
    const ticketId = typeof ticket.ticket_id === 'string' ? ticket.ticket_id : '';
    const ticketIdRaw = ticket._id;
    const ticketIdStr = typeof ticketIdRaw === 'string' ? ticketIdRaw : (ticketIdRaw ? String(ticketIdRaw) : '');
    const ticket_number = displayId || ticketId || `TKT-${ticketIdStr ? ticketIdStr.slice(-6) : '000000'}`;

    // Get ID fields
    const idRaw = ticket._id || ticket.id;
    const id = typeof idRaw === 'string' ? idRaw : (idRaw ? String(idRaw) : String(Math.random()));
    
    // Get requester name
    const nameStr = typeof ticket.name === 'string' ? ticket.name : '';
    const emailStr = typeof ticket.email === 'string' ? ticket.email : '';
    const requester_name = nameStr || (emailStr ? emailStr.split('@')[0] : '') || 'Unknown';

    // Get assignee info
    const assignedTo = ticket.assigned_to;
    let assignee_id: string | undefined;
    let assignee_name: string | undefined;
    if (assignedTo) {
      if (typeof assignedTo === 'string') {
        assignee_id = assignedTo;
        assignee_name = assignedTo;
      } else if (typeof assignedTo === 'object' && assignedTo !== null) {
        const assignedToObj = assignedTo as Record<string, unknown>;
        assignee_id = typeof assignedToObj._id === 'string' ? assignedToObj._id : (typeof assignedToObj.id === 'string' ? assignedToObj.id : undefined);
        assignee_name = typeof assignedToObj.name === 'string' ? assignedToObj.name : (typeof assignedToObj.email === 'string' ? assignedToObj.email : undefined);
      }
    }

    // Get attachments count
    const attachments = Array.isArray(ticket.attachments) ? ticket.attachments.length : (ticket.attachments ? 1 : 0);

    // Get tags
    const tagsRaw = ticket.tags;
    const tags = Array.isArray(tagsRaw) && tagsRaw.every(tag => typeof tag === 'string') 
      ? tagsRaw as string[] 
      : (issueTypeStr ? [issueTypeStr] : []);

    // Get SLA status
    type SLAStatus = 'pending' | 'on_time' | 'at_risk' | 'breached';
    const slaStatusRaw = ticket.sla_status;
    let sla_status: Ticket['sla_status'];
    if (slaStatusRaw && typeof slaStatusRaw === 'object' && slaStatusRaw !== null && 'status' in slaStatusRaw) {
      const slaObj = slaStatusRaw as { status: unknown; resolution_due?: unknown };
      const statusValue = slaObj.status;
      const validStatuses: SLAStatus[] = ['pending', 'on_time', 'at_risk', 'breached'];
      const slaStatus: SLAStatus = (typeof statusValue === 'string' && validStatuses.includes(statusValue as SLAStatus))
        ? statusValue as SLAStatus
        : 'pending';
      sla_status = {
        status: slaStatus,
        resolution_due: typeof slaObj.resolution_due === 'string' ? slaObj.resolution_due : undefined
      };
    } else {
      sla_status = {
        status: 'pending' as const,
        resolution_due: typeof ticket.resolution_due === 'string' ? ticket.resolution_due : undefined
      };
    }

    return {
      id: id,
      ticket_number: ticket_number,
      subject: subject,
      description: description,
      priority: priority,
      status: status as Ticket['status'],
      requester_id: (ticket._id || ticket.id || '') as string,
      requester_name: requester_name,
      assignee_id: assignee_id,
      assignee_name: ticket.assigned_to_name ? (ticket.assigned_to_name as string) : assignee_name,
      attachments: attachments,
      tags: tags,
      created_at: created_at,
      updated_at: updated_at,
      sla_status: sla_status,
      email: emailStr,
      mobile: (typeof ticket.mobile === 'string' ? ticket.mobile : '') || (typeof ticket.phone === 'string' ? ticket.phone : ''),
      issue_type: issueTypeStr,
      severity: severity
    };
  };

  // Transform backend user to frontend User format (from /api/v1/users endpoint)
  const transformUser = (user: Record<string, unknown>): User => {
    // Determine role from userRoles field - this is the key field for filtering agents
    // Handle both "agent" and "Agent" (case-insensitive)
    let role: User['role'] = 'employee';
    
    // Check userRoles field first (primary field from /api/v1/users endpoint)
    if (user.userRoles) {
      const userRolesStr = String(user.userRoles).trim();
      const userRolesLower = userRolesStr.toLowerCase();
      
      // Check for lowercase versions (most common)
      if (['admin', 'agent', 'employee', 'customer'].includes(userRolesLower)) {
        role = userRolesLower as User['role'];
      }
      // Also check for capitalized versions
      else if (['Admin', 'Agent', 'Employee', 'Customer'].includes(userRolesStr)) {
        role = userRolesLower as User['role'];
      }
      // Handle any case variation
      else if (userRolesLower.includes('agent')) {
        role = 'agent';
      }
    } 
    // Fallback to role field if userRoles is not available
    else if (user.role) {
      const roleStr = String(user.role).trim();
      const roleLower = roleStr.toLowerCase();
      
      if (['admin', 'agent', 'employee', 'customer'].includes(roleLower)) {
        role = roleLower as User['role'];
      }
      else if (['Admin', 'Agent', 'Employee', 'Customer'].includes(roleStr)) {
        role = roleLower as User['role'];
      }
      else if (roleLower.includes('agent')) {
        role = 'agent';
      }
    }
    
    // Safely convert ID to string (handles MongoDB ObjectId and other types)
    const getId = (idValue: unknown): string | null => {
      if (!idValue) return null;
      if (typeof idValue === 'string' && idValue.trim() !== '') return idValue;
      if (typeof idValue === 'object') {
        // Handle MongoDB ObjectId or objects with toString
        if ('toString' in idValue && typeof idValue.toString === 'function') {
          const str = String(idValue.toString());
          return str && str !== '[object Object]' ? str : null;
        }
        // Skip empty objects
        if (Object.keys(idValue).length === 0) return null;
      }
      const str = String(idValue);
      return str && str !== '[object Object]' && str.trim() !== '' ? str : null;
    };
    
    const userId = getId(user.id) || getId(user._id) || String(Math.random());
    
    // Safely extract string values
    const getString = (value: unknown, defaultValue: string = ''): string => {
      if (typeof value === 'string') return value;
      if (value == null) return defaultValue;
      const str = String(value);
      return str !== '[object Object]' ? str : defaultValue;
    };
    
    // Safely extract boolean values
    const getBoolean = (value: unknown, defaultValue: boolean = false): boolean => {
      if (typeof value === 'boolean') return value;
      if (value == null) return defaultValue;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'active' || lower === 'activated';
      }
      return Boolean(value);
    };
    
    // Extract full name - user endpoint uses fullName (camelCase)
    const fullName = getString(user.fullName) || 
                     getString(user.full_name) || 
                     getString(user.name) || 
                     getString(user.username) || 
                     `${getString(user.first_name)} ${getString(user.last_name)}`.trim() || 
                     'Unknown User';
    
    // Extract email
    const email = getString(user.email);
    
    // Extract status - user endpoint uses 'status' field with 'activated'/'deactivated'
    const statusValue = getString(user.status);
    const isActive = user.is_active !== undefined 
      ? getBoolean(user.is_active, true)
      : (statusValue.toLowerCase() === 'activated' || statusValue.toLowerCase() === 'active');
    
    // Extract dates - user endpoint uses createdAt (camelCase)
    const createdAt = getString(user.createdAt) || 
                      getString(user.created_at) || 
                      getString(user.created_date) || 
                      new Date().toISOString();
    const updatedAt = getString(user.updatedAt) || 
                     getString(user.updated_at) || 
                     getString(user.updated_date) || 
                     undefined;
    
    return {
      id: userId,
      full_name: fullName,
      email: email,
      role: role,
      is_active: isActive,
      created_at: createdAt,
      updated_at: updatedAt || undefined
    };
  };

  // Fetch tickets and users from API
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      let baseUrl = BACKEND_URL || process.env['NEXT_PUBLIC_API_URL'] || 'https://py-mobiloitte.converiqo.ai';
      // Only convert HTTP to HTTPS for non-localhost URLs
      if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        baseUrl = baseUrl.replace('http://', 'https://');
      }
      const headers = getAuthHeaders();

      // Fetch tickets and users in parallel (only customer tickets, not employee tickets)
      // Using user endpoint: /api/v1/users
      // Will filter for agents (userRole === 'agent') on frontend
      const [customerTicketsRes, usersRes] = await Promise.allSettled([
        fetch(`${baseUrl}/api/v1/helpdesk/tickets`, { headers }),
        fetch(`${baseUrl}/api/v1/users`, { headers }) // Fetch all users, will filter for agents
      ]);

      // Process customer tickets only (no employee tickets)
      let customerTickets: Ticket[] = [];
      const idMap: Record<string, { mongoId: string; ticketId?: string }> = {};
      
      if (customerTicketsRes.status === 'fulfilled' && customerTicketsRes.value.ok) {
        try {
          const customerData = await customerTicketsRes.value.json();
          const ticketsArray = Array.isArray(customerData) ? customerData : (customerData.tickets || customerData.data || []);
          customerTickets = ticketsArray.length > 0 
            ? ticketsArray.map((ticket: Record<string, unknown>) => {
                const transformed = transformTicket(ticket);
                // Store the original MongoDB _id, formatted ticket_id, and type
                const mongoId = ticket._id || ticket.id || transformed.id;
                const ticketIdRaw = ticket.ticket_id || ticket.display_id;
                const formattedTicketId = typeof ticketIdRaw === 'string' ? ticketIdRaw : undefined;
                const ticketKey = transformed.id;
                idMap[ticketKey] = { mongoId: String(mongoId), ticketId: formattedTicketId };
                return transformed;
              })
            : [];
        } catch (e) {
          console.error('Error parsing customer tickets:', e);
        }
      }

      // Set only customer tickets (no employee tickets)
      setTickets(customerTickets);
      setTicketIdMap(idMap);

      // Process users from user endpoint
      let fetchedUsers: User[] = [];
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        try {
          const usersData = await usersRes.value.json();
          // User endpoint returns: array of users
          const usersArray = Array.isArray(usersData) ? usersData : [];
          
          console.log(`Raw users data:`, usersArray.length, 'users');
          if (usersArray.length > 0) {
            console.log('Sample user data:', {
              id: usersArray[0].id,
              fullName: usersArray[0].fullName,
              email: usersArray[0].email,
              userRoles: usersArray[0].userRoles,
              role: usersArray[0].role
            });
          }
          
          // Transform all users
          fetchedUsers = usersArray.map((user: Record<string, unknown>) => transformUser(user));
          
          console.log('Transformed users:', fetchedUsers.map(u => ({
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            role: u.role
          })));
          
          // Filter to only show agents (handles both "agent" and "Agent" - case-insensitive)
          const agentsBeforeFilter = fetchedUsers.length;
          fetchedUsers = fetchedUsers.filter(user => {
            const isAgent = user.role === 'agent' || user.role?.toLowerCase() === 'agent';
            if (!isAgent && user.role) {
              console.log(`User ${user.email} has role "${user.role}" (not agent)`);
            }
            return isAgent;
          });
          
          console.log(`Fetched ${usersArray.length} total users, ${agentsBeforeFilter} transformed, filtered to ${fetchedUsers.length} agents`);
          
          if (fetchedUsers.length === 0 && usersArray.length > 0) {
            const allTransformedUsers = usersArray.map((user: Record<string, unknown>) => transformUser(user));
            const rawRoles = usersArray
              .map(user => user.userRoles)
              .filter((role): role is string | string[] => typeof role === 'string' || Array.isArray(role));
            console.warn('No agents found! Available roles in transformed users:', 
              [...new Set(allTransformedUsers.map(u => u.role))],
              'Raw userRoles from API:', 
              [...new Set(rawRoles)],
              'Sample raw user:', usersArray[0]
            );
          }
        } catch (e) {
          console.error('Error parsing users from user endpoint:', e);
        }
      } else if (usersRes.status === 'rejected') {
        console.error('Error fetching users from user endpoint:', usersRes.reason);
      } else {
        console.error('Users fetch failed:', usersRes.status);
      }
      setUsers(fetchedUsers);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debug: Log when users change
  useEffect(() => {
    console.log('Users state updated:', {
      totalUsers: users.length,
      agents: users.filter(u => u.role === 'agent' || u.role?.toLowerCase() === 'agent').length,
      allRoles: [...new Set(users.map(u => u.role))],
      userDetails: users.map(u => ({ email: u.email, role: u.role, full_name: u.full_name }))
    });
  }, [users]);

  // Filter and sort tickets
  useEffect(() => {
    if (!canManageTickets && selectedTickets.length > 0) {
      setSelectedTickets([]);
    }
  }, [canManageTickets, selectedTickets.length]);

  const roleScopedTickets = useMemo(() => {
    if (!isAgentUser) return tickets;
    
    return tickets.filter(ticket => {
      const assigneeId = (ticket.assignee_id || '').toLowerCase();
      const assigneeName = (ticket.assignee_name || '').toLowerCase();
      
      const matchesAgent =
        (agentIdentifiers.email && (assigneeId === agentIdentifiers.email || assigneeName.includes(agentIdentifiers.email))) ||
        (agentIdentifiers.id && assigneeId === agentIdentifiers.id) ||
        (agentIdentifiers.name && (assigneeName === agentIdentifiers.name || assigneeName.includes(agentIdentifiers.name)));

      return matchesAgent;
    });
  }, [tickets, isAgentUser, agentIdentifiers]);

  const filteredAndSortedTickets = roleScopedTickets
    .filter(ticket => {
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        switch (searchField) {
          case 'ticket_id':
            matchesSearch = ticket.ticket_number.toLowerCase().includes(query);
            break;
          case 'subject':
            matchesSearch = ticket.subject.toLowerCase().includes(query);
            break;
          case 'requester':
            matchesSearch = ticket.requester_name.toLowerCase().includes(query);
            break;
          case 'description':
            matchesSearch = ticket.description.toLowerCase().includes(query);
            break;
          case 'all':
          default:
            matchesSearch = Boolean(ticket.ticket_number.toLowerCase().includes(query) ||
                           ticket.subject.toLowerCase().includes(query) ||
                           ticket.description.toLowerCase().includes(query) ||
                           ticket.requester_name.toLowerCase().includes(query) ||
                           (ticket.assignee_name && ticket.assignee_name.toLowerCase().includes(query)));
            break;
        }
      }
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'all' || 
                             (assigneeFilter === 'unassigned' ? !ticket.assignee_id : ticket.assignee_id === assigneeFilter);
      
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    })
    .sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'created_at') {
        compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'updated_at') {
        compareValue = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else if (sortBy === 'priority') {
        const priorityOrder = { 'low': 0, 'medium': 1, 'high': 2, 'urgent': 3 };
        compareValue = priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === 'status') {
        compareValue = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

  // Pagination calculations
  const totalItems = filteredAndSortedTickets.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = filteredAndSortedTickets.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Determine ticket type and API endpoint - all tickets are customer tickets
  const getTicketTypeAndId = (ticket: EnrichedTicket): { type: 'customer' | 'employee', ticketId: string } => {
    // All tickets shown are customer tickets
    const type: 'customer' | 'employee' = 'customer';
    // Use MongoDB _id (stored in ticket.id) for API calls - backend accepts ObjectId string
    const idInfo = ticketIdMap[ticket.id] || { mongoId: ticket.id };
    return {
      type: type,
      ticketId: idInfo.mongoId // Use MongoDB ObjectId for API calls
    };
  };

  const getErrorMessage = (error: unknown, fallback = 'Unknown error'): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === 'string') {
        return maybeMessage;
      }
    }
    return fallback;
  };

  const handleBulkAction = async (action: string) => {
    if (selectedTickets.length === 0) return;
    
    // For assignment, show modal instead of direct action
    if (action === 'assign') {
      setShowAssignModal(true);
      return;
    }
    
    setActionLoading(action);
    setError(null);
    
    try {
      let baseUrl = BACKEND_URL || process.env['NEXT_PUBLIC_API_URL'] || 'https://py-mobiloitte.converiqo.ai';
      // Only convert HTTP to HTTPS for non-localhost URLs
      if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        baseUrl = baseUrl.replace('http://', 'https://');
      }
      const headers = getAuthHeaders();

      const selectedTicketObjects = tickets.filter(t => selectedTickets.includes(t.id));
      const results = await Promise.allSettled(
        selectedTicketObjects.map(async (ticket) => {
          const { ticketId } = getTicketTypeAndId(ticket);
          // All tickets are customer tickets - use customer endpoint only
          const prefix = '/api/v1/helpdesk';
          
          switch (action) {
            case 'escalate':
              // Use the new escalation endpoint
              const ticketSeverity = ticket.severity || 'Low';
              const severityMap: Record<string, string> = {
                'low': 'Medium',
                'medium': 'High',
                'high': 'High',
                'critical': 'Critical'
              };
              const newSeverity = severityMap[ticketSeverity.toLowerCase()] || 'Medium';
              
              const escalateRes = await fetch(`${baseUrl}${prefix}/tickets/${ticketId}/escalate`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  severity: newSeverity,
                  reason: 'Bulk escalation',
                  escalated_by: typeof window !== 'undefined' ? localStorage.getItem('userEmail') || '' : ''
                })
              });
              if (!escalateRes.ok) {
                const errorData = await escalateRes.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to escalate ticket');
              }
              return { success: true };
              
            case 'close':
              const closeRes = await fetch(`${baseUrl}${prefix}/tickets/${ticketId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: 'closed' })
              });
              if (!closeRes.ok) throw new Error('Failed to close ticket');
              return { success: true };
              
            case 'delete':
              const deleteRes = await fetch(`${baseUrl}${prefix}/tickets/${ticketId}`, {
                method: 'DELETE',
                headers
              });
              if (!deleteRes.ok) throw new Error('Failed to delete ticket');
              return { success: true };
              
            default:
              return { success: false, message: 'Unknown action' };
          }
        })
      );

      // Count successes
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      
      if (successCount > 0) {
        // Refresh data after successful action
        await fetchData(true);
        setSelectedTickets([]);
      } else {
        setError(`Failed to ${action} tickets. Please try again.`);
      }
    } catch (err) {
      console.error('Error in bulk action:', err);
      setError(`Failed to ${action} tickets. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTicketSelect = (ticketId: string) => {
    if (!canManageTickets) return;
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (!canManageTickets) return;
    const allPaginatedIds = paginatedTickets.map(ticket => ticket.id);
    const allSelected = allPaginatedIds.every(id => selectedTickets.includes(id));
    
    if (allSelected) {
      // Deselect all paginated tickets
      setSelectedTickets(prev => prev.filter(id => !allPaginatedIds.includes(id)));
    } else {
      // Select all paginated tickets
      setSelectedTickets(prev => [...new Set([...prev, ...allPaginatedIds])]);
    }
  };

  // Handle ticket assignment
  const handleAssignTickets = async () => {
    if (!selectedEmployeeId || selectedTickets.length === 0) {
      setError('Please select an agent to assign tickets to');
      return;
    }

    setAssigningTickets(true);
    setError(null);

    try {
      let baseUrl = BACKEND_URL || process.env['NEXT_PUBLIC_API_URL'] || 'https://py-mobiloitte.converiqo.ai';
      // Only convert HTTP to HTTPS for non-localhost URLs
      if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        baseUrl = baseUrl.replace('http://', 'https://');
      }
      const headers = getAuthHeaders();

      const selectedTicketObjects = tickets.filter(t => selectedTickets.includes(t.id));
      const selectedEmployee = users.find(u => u.id === selectedEmployeeId);

      if (!selectedEmployee) {
        throw new Error('Selected employee not found');
      }

      const results = await Promise.allSettled(
        selectedTicketObjects.map(async (ticket) => {
          const { ticketId } = getTicketTypeAndId(ticket);
          const prefix = '/api/v1/helpdesk';

          // Call the assignment endpoint
          const assignRes = await fetch(`${baseUrl}${prefix}/tickets/${ticketId}/assign`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              assigned_to: selectedEmployee.email || selectedEmployeeId, // Use email for better matching
              assigned_to_name: selectedEmployee.full_name || selectedEmployee.email || 'Unknown'
            })
          });

          if (!assignRes.ok) {
            const errorText = await assignRes.text();
            throw new Error(`Failed to assign ticket: ${errorText || assignRes.statusText}`);
          }

          return { success: true };
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failedCount = selectedTickets.length - successCount;
      
      if (successCount > 0) {
        await fetchData(true);
        setSelectedTickets([]);
        setShowAssignModal(false);
        setSelectedEmployeeId('');
        if (failedCount > 0) {
          setError(`Assigned ${successCount} ticket(s), but ${failedCount} failed.`);
        }
      } else {
        const errorMessages = results
          .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
          .map(r => {
            if (r.status === 'rejected') {
              return getErrorMessage(r.reason);
            } else {
              // For fulfilled but not successful, check if there's a message property
              const value = r.value;
              if (value && typeof value === 'object') {
                const maybeMessage = (value as { message?: unknown }).message;
                const maybeError = (value as { error?: unknown }).error;
                if (typeof maybeMessage === 'string') return maybeMessage;
                if (typeof maybeError === 'string') return maybeError;
              }
              return 'Unknown error';
            }
          })
          .filter(Boolean);
        setError(`Failed to assign tickets: ${errorMessages[0] || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      console.error('Error assigning tickets:', err);
      setError(getErrorMessage(err, 'Failed to assign tickets. Please try again.'));
    } finally {
      setAssigningTickets(false);
    }
  };

  // Function to handle individual ticket assignment
  const handleIndividualAssign = (ticketId: string) => {
    setSelectedTickets([ticketId]);
    setShowAssignModal(true);
  };

  // Function to handle individual ticket closing
  const handleIndividualClose = (ticketId: string) => {
    setTicketToClose(ticketId);
    setShowCloseModal(true);
  };

  // Function to handle individual ticket escalation
  const handleIndividualEscalate = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      // Set default severity based on current severity
      const currentSeverity = ticket.severity || 'Low';
      const severityMap: Record<string, string> = {
        'low': 'Medium',
        'medium': 'High',
        'high': 'High',
        'critical': 'Critical'
      };
      setSelectedSeverity(severityMap[currentSeverity.toLowerCase()] || 'Medium');
    }
    setTicketToEscalate(ticketId);
    setShowEscalateModal(true);
  };

  // Function to confirm and escalate ticket
  const handleConfirmEscalate = async () => {
    if (!ticketToEscalate || !selectedSeverity) return;

    setEscalatingTicket(true);
    setError(null);

    try {
      let baseUrl = BACKEND_URL || process.env['NEXT_PUBLIC_API_URL'] || 'https://py-mobiloitte.converiqo.ai';
      // Only convert HTTP to HTTPS for non-localhost URLs
      if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        baseUrl = baseUrl.replace('http://', 'https://');
      }
      const headers = getAuthHeaders();

      const ticket = tickets.find(t => t.id === ticketToEscalate);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const { ticketId } = getTicketTypeAndId(ticket);
      const prefix = '/api/v1/helpdesk';

      // Get current user email for escalated_by
      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') || '' : '';

      const response = await fetch(`${baseUrl}${prefix}/tickets/${ticketId}/escalate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          severity: selectedSeverity,
          reason: escalationReason || undefined,
          escalated_by: userEmail || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to escalate ticket');
      }

      // Refresh tickets
      await fetchData();
      setShowEscalateModal(false);
      setTicketToEscalate(null);
      setSelectedSeverity('');
      setEscalationReason('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to escalate ticket'));
    } finally {
      setEscalatingTicket(false);
    }
  };

  // Function to confirm and close ticket
  const handleConfirmClose = async () => {
    if (!ticketToClose) return;

    setClosingTicket(true);
    setError(null);

    try {
      let baseUrl = BACKEND_URL || process.env['NEXT_PUBLIC_API_URL'] || 'https://py-mobiloitte.converiqo.ai';
      // Only convert HTTP to HTTPS for non-localhost URLs
      if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        baseUrl = baseUrl.replace('http://', 'https://');
      }
      const headers = getAuthHeaders();

      const ticket = tickets.find(t => t.id === ticketToClose);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const { ticketId } = getTicketTypeAndId(ticket);
      const prefix = '/api/v1/helpdesk';

      const closeRes = await fetch(`${baseUrl}${prefix}/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'closed' })
      });

      if (!closeRes.ok) {
        const errorText = await closeRes.text();
        throw new Error(`Failed to close ticket: ${errorText || closeRes.statusText}`);
      }

      // Refresh data after successful close
      await fetchData(true);
      setShowCloseModal(false);
      setTicketToClose(null);
    } catch (err: unknown) {
      console.error('Error closing ticket:', err);
      setError(getErrorMessage(err, 'Failed to close ticket. Please try again.'));
    } finally {
      setClosingTicket(false);
    }
  };

  // Filter employees - only show agents for ticket assignment
  // Agents are the ones who solve customer tickets
  // Handle both "agent" and "Agent" (case-insensitive)
  const availableEmployees = users.filter(user => 
    user.role === 'agent' || user.role?.toLowerCase() === 'agent'
  );

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const assigneeOptions = [
    { value: 'all', label: 'All Assignees' },
    { value: 'unassigned', label: 'Unassigned' },
    ...users.filter(user => 
      user.role === 'agent' || user.role?.toLowerCase() === 'agent'
    ).map(user => ({
      value: user.id,
      label: user.full_name
    }))
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Created Date' },
    { value: 'updated_at', label: 'Updated Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' }
  ];

  // Helper to check if ticket is overdue (SLA breach)
  const isTicketOverdue = useCallback((ticket: Ticket): boolean => {
    if (!ticket.sla_status?.resolution_due) return false;
    const dueDate = new Date(ticket.sla_status.resolution_due);
    return dueDate.getTime() < now && ticket.status !== 'closed' && ticket.status !== 'resolved';
  }, [now]);

  // Helper to check if ticket is at risk (approaching SLA breach)
  const isTicketAtRisk = useCallback((ticket: Ticket): boolean => {
    if (!ticket.sla_status?.resolution_due || ticket.status === 'closed' || ticket.status === 'resolved') return false;
    const dueDate = new Date(ticket.sla_status.resolution_due);
    const timeUntilDue = dueDate.getTime() - now;
    const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);
    // At risk if less than 2 hours remaining
    return hoursUntilDue > 0 && hoursUntilDue <= 2;
  }, [now]);

  // Calculate statistics
  const stats = useMemo(() => {
    const source = roleScopedTickets;
    return {
      total: source.length,
      open: source.filter(t => t.status === 'open').length,
      inProgress: source.filter(t => t.status === 'in_progress').length,
      pending: source.filter(t => t.status === 'pending').length,
      resolved: source.filter(t => t.status === 'resolved').length,
      closed: source.filter(t => t.status === 'closed').length,
      urgent: source.filter(t => t.priority === 'urgent').length,
      overdue: source.filter(t => isTicketOverdue(t)).length,
      atRisk: source.filter(t => isTicketAtRisk(t)).length
    };
  }, [roleScopedTickets, isTicketOverdue, isTicketAtRisk]);

  // Export functionality
  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    const replacer = (key: string, value: unknown) => value === null ? '' : value;
    const header = Object.keys(data[0]);
    const csv = [
      header.join(','),
      ...data.map((row: Record<string, unknown>) => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = (type: 'csv' | 'excel' = 'excel') => {
    const ticketsToExport = filteredAndSortedTickets;
    const dataToExport = ticketsToExport.map((ticket, index) => {
      const ticketWithExtras = ticket as Ticket & { email?: string; mobile?: string; issue_type?: string; severity?: string };
      return {
        '#': index + 1,
        'Ticket ID': ticket.ticket_number,
        'Name': ticket.requester_name,
        'Email': ticketWithExtras.email || '-',
        'Phone': ticketWithExtras.mobile || '-',
        'Issue Type': ticketWithExtras.issue_type || ticket.tags?.[0] || '-',
        'Subject': ticket.subject,
        'Priority': ticket.priority,
        'Severity': ticketWithExtras.severity || '-',
        'Status': ticket.status,
        'Assignee': ticket.assignee_name || 'Unassigned',
        'Created Date': new Date(ticket.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        'SLA Status': ticket.sla_status?.status || 'N/A',
        'SLA Due': ticket.sla_status?.resolution_due 
          ? new Date(ticket.sla_status.resolution_due).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })
          : 'N/A'
      };
    });

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    if (type === 'csv') {
      exportToCSV(dataToExport, `servicedesk_tickets_${timestamp}.csv`);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");
      XLSX.writeFile(workbook, `servicedesk_tickets_${timestamp}.xlsx`);
    }
    setDownloadMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950/50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950/50 transition-colors duration-500">
      <div className="w-full flex flex-col items-center p-2 sm:p-4 md:p-6 gap-6">
        
        {/* Enhanced Page Header */}
        <div className="w-full">
          <DashboardHeader
            title="Ticket Management"
            subtitle="Full control over all tickets - assign, escalate, resolve, and close tickets"
            icon={MessageSquare}
            iconColor="text-white"
            variant="default"
            size="lg"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Service Desk', href: '/servicedesk/servicedesk-dashboard' },
              { label: 'Ticket Management' }
            ]}
            actions={
              <div className="flex items-center gap-3">
                <div className="relative" ref={downloadMenuRef}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 border border-white/30"
                  >
                    <Download className="w-5 h-5" />
                    <span className="hidden sm:inline">Export</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} />
                  </motion.button>
                  {downloadMenuOpen && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                      >
                        <button
                          onClick={() => handleExport('excel')}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export to Excel
                        </button>
                        <button
                          onClick={() => handleExport('csv')}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export to CSV
                        </button>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </motion.button>
              </div>
            }
          />
        </div>

        {/* Enhanced Stats Cards */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 sm:gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 text-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50/50 dark:from-blue-950/30 dark:via-gray-800 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 text-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Open</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.open}</p>
                </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-purple-50/50 dark:from-purple-950/30 dark:via-gray-800 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 text-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.inProgress}</p>
                </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-amber-50/50 dark:from-amber-950/30 dark:via-gray-800 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 text-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="group"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-green-50/50 dark:from-green-950/30 dark:via-gray-800 dark:to-green-900/20 border border-green-200/50 dark:border-green-800/50 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 text-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Resolved</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolved}</p>
                </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="group"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 text-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Closed</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.closed}</p>
                </div>
                </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="group"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-red-50/50 dark:from-red-950/30 dark:via-gray-800 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 text-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue
                </p>
                <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
                </div>
                </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="group"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-yellow-50/50 dark:from-yellow-950/30 dark:via-gray-800 dark:to-yellow-900/20 border border-yellow-200/50 dark:border-yellow-800/50 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 text-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  At Risk
                </p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.atRisk}</p>
                </div>
                </div>
          </motion.div>
        </div>

        {/* Enhanced Filters and Controls */}
        <div className="w-full">
          <div className="relative bg-gradient-to-br from-white via-white to-blue-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-blue-950/20 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden mb-6">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>
            <div className="p-6 sm:p-8 relative z-10">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Search & Filter</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Find and filter tickets easily</p>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Tickets
                  </label>
                  <div className="flex gap-2">
                    <div className="w-32 flex-shrink-0 relative">
                      <Select
                        options={[
                          { value: 'all', label: 'All Fields' },
                          { value: 'ticket_id', label: 'Ticket ID' },
                          { value: 'subject', label: 'Subject' },
                          { value: 'requester', label: 'Requester' },
                          { value: 'description', label: 'Description' }
                        ]}
                        defaultValue={searchField}
                        onChange={(value) => setSearchField(value as 'all' | 'ticket_id' | 'subject' | 'requester' | 'description')}
                        placeholder="Search in"
                        className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${searchField === 'all' ? 'tickets' : searchField.replace('_', ' ')}`}
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 pl-10 pr-10"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row gap-4 lg:w-auto">
                  <div className="flex-1 sm:flex-initial">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <div className="relative">
                      <Select
                        options={statusOptions}
                        defaultValue={statusFilter}
                        onChange={setStatusFilter}
                        placeholder="All Status"
                        className="w-full sm:w-40 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 sm:flex-initial">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <div className="relative">
                      <Select
                        options={priorityOptions}
                        defaultValue={priorityFilter}
                        onChange={setPriorityFilter}
                        placeholder="All Priority"
                        className="w-full sm:w-40 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 sm:flex-initial">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assignee
                    </label>
                    <div className="relative">
                      <Select
                        options={assigneeOptions}
                        defaultValue={assigneeFilter}
                        onChange={setAssigneeFilter}
                        placeholder="All Assignees"
                        className="w-full sm:w-40 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 sm:flex-initial">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort By
                    </label>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 relative">
                        <Select
                          options={sortOptions}
                          defaultValue={sortBy}
                          onChange={(value) => setSortBy(value as 'created_at' | 'priority' | 'status' | 'updated_at')}
                          placeholder="Sort By"
                          className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="h-[42px] px-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center"
                        title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                      >
                        {sortOrder === 'asc' ? <ArrowUp className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <ArrowDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <div className="relative bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 border border-red-200/60 dark:border-red-700/60 rounded-2xl shadow-lg overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
              <div className="p-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-red-900 dark:text-red-100 flex-1">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-bold text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Bulk Actions */}
        {canManageTickets && selectedTickets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/60 dark:border-blue-700/60 rounded-2xl shadow-lg overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              <div className="p-4 sm:p-5 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-blue-900 dark:text-blue-100">
                      {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => handleBulkAction('assign')}
                      disabled={actionLoading !== null}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {actionLoading === 'assign' ? 'Assigning...' : 'Assign'}
                    </Button>
                    <Button
                      onClick={() => handleBulkAction('escalate')}
                      disabled={actionLoading !== null}
                      className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {actionLoading === 'escalate' ? 'Escalating...' : 'Escalate'}
                    </Button>
                    <Button
                      onClick={() => handleBulkAction('close')}
                      disabled={actionLoading !== null}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {actionLoading === 'close' ? 'Closing...' : 'Close'}
                    </Button>
                    <Button
                      onClick={() => handleBulkAction('delete')}
                      disabled={actionLoading !== null}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button
                      onClick={() => setSelectedTickets([])}
                      disabled={actionLoading !== null}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Tickets List */}
        <div className="w-full">
          <div className="relative bg-gradient-to-br from-white via-white to-blue-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-blue-950/20 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>
            <div className="p-6 sm:p-8 relative z-10">
              <ComponentCard title="Tickets Table">
                <div className="px-3 py-4 border-b border-gray-200 dark:border-gray-700 mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage and track all your customer tickets in one place</p>
                </div>
                
                <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                  <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-800">
                    <div className="min-w-[1200px]">
                      {filteredAndSortedTickets.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Tickets Found</h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
                              ? 'Try adjusting your search or filters'
                              : 'No tickets available at the moment'
                            }
                          </p>
                        </div>
                      ) : (
                        <Table className="w-full">
                          <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                            <TableRow className="hover:bg-transparent">
                              {canManageTickets && (
                                <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-12">
                                  <input
                                    type="checkbox"
                                    checked={paginatedTickets.length > 0 && paginatedTickets.every(t => selectedTickets.includes(t.id))}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                  />
                                </th>
                              )}
                              <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-20">Ticket ID</th>
                              <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-28">Name</th>
                              <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-36">Email</th>
                              <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-28">Mobile</th>
                              <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-24">Issue Type</th>
                              <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-24">Issue</th>
                              <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-20">Severity</th>
                              <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-20">Status</th>
                              <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-24">Assignee</th>
                              <th 
                                onClick={() => {
                                  setSortBy('created_at');
                                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                }}
                                className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-24"
                              >
                                Date {sortBy === 'created_at' && (sortOrder === 'desc' ? <ArrowDown className="inline w-4 h-4 ml-1" /> : <ArrowUp className="inline w-4 h-4 ml-1" />)}
                              </th>
                              {canManageTickets && (
                                <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-20">
                                  Actions
                                </th>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedTickets.map((ticket) => {
                              const ticketWithExtras = ticket as Ticket & { email?: string; mobile?: string; issue_type?: string; severity?: string };
                              const isOverdue = isTicketOverdue(ticket);
                              const isAtRisk = isTicketAtRisk(ticket);
                              
                              const statusColors = {
                                open: 'bg-blue-100 text-blue-700 border border-blue-300',
                                pending: 'bg-blue-100 text-blue-700 border border-blue-300',
                                in_progress: 'bg-blue-100 text-blue-700 border border-blue-300',
                                resolved: 'bg-blue-100 text-blue-700 border border-blue-300',
                                closed: 'bg-gray-200 text-gray-700 border border-gray-300',
                              };
                              
                              return (
                                <TableRow
                                  key={ticket.id}
                                  className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-violet-50/50 dark:hover:from-blue-900/10 dark:hover:to-violet-900/10 transition-all duration-200 group ${
                                    isOverdue ? 'bg-red-50/50 dark:bg-red-900/10 border-l-4 border-l-red-500' : 
                                    isAtRisk ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-l-4 border-l-yellow-500' : ''
                                  }`}
                                >
                                  {canManageTickets && (
                                    <td className="px-3 py-4">
                                      <input
                                        type="checkbox"
                                        checked={selectedTickets.includes(ticket.id)}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleTicketSelect(ticket.id);
                                        }}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                      />
                                    </td>
                                  )}
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                      <Link 
                                        href={`/servicedesk/servicedesk-ticket-management/${ticket.id}`}
                                        className="font-bold underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                        title="Click to view ticket details"
                                      >
                                        {ticket.ticket_number}
                                      </Link>
                                      {isOverdue && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700" title="SLA Breached">
                                          <AlertTriangle className="w-3 h-3" />
                                          Overdue
                                        </span>
                                      )}
                                      {isAtRisk && !isOverdue && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700" title="SLA At Risk">
                                          <Clock className="w-3 h-3" />
                                          At Risk
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-gray-900 dark:text-white max-w-[220px] font-medium overflow-hidden whitespace-nowrap text-ellipsis" title={ticket.requester_name}>
                                    {ticket.requester_name}
                                  </td>
                                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300 max-w-[260px] overflow-hidden whitespace-nowrap text-ellipsis" title={ticketWithExtras.email || '-'}>
                                    {ticketWithExtras.email || '-'}
                                  </td>
                                  <td className="px-5 py-4 text-gray-900 dark:text-white">{ticketWithExtras.mobile || '-'}</td>
                                  <td className="px-5 py-4 text-gray-800 dark:text-white">
                                    {ticketWithExtras.issue_type || ticket.tags?.[0] || '-'}
                                  </td>
                                  <td className="px-5 py-4 text-gray-800 dark:text-white">
                                    {ticket.subject}
                                  </td>
                                  <td className="px-5 py-4 text-sm whitespace-nowrap">
                                    <span className="inline-block px-3 py-1 rounded-full font-semibold text-xs bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                                      {(ticketWithExtras.severity || 'Unknown').charAt(0).toUpperCase() + (ticketWithExtras.severity || 'Unknown').slice(1)}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-sm whitespace-nowrap">
                                    <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${statusColors[ticket.status] || statusColors.open}`}>
                                      {ticket.status === 'open' ? 'New' : ticket.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-sm">
                                    {ticket.assignee_name ? (
                                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                        <UserPlus className="w-3 h-3" />
                                        {ticket.assignee_name}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                                        Unassigned
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-4 text-gray-800 dark:text-white text-sm whitespace-nowrap">
                                    {new Date(ticket.created_at).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                      year: "2-digit"
                                    })}
                                  </td>
                                  {canManageTickets && (
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-2">
                                        {ticket.status !== 'closed' && (
                                          <>
                                            <motion.button
                                              whileHover={{ scale: 1.05 }}
                                              whileTap={{ scale: 0.95 }}
                                              onClick={() => handleIndividualAssign(ticket.id)}
                                              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors flex items-center gap-1"
                                              title="Assign ticket to employee"
                                            >
                                              <UserPlus className="w-3 h-3" />
                                              Assign
                                            </motion.button>
                                            <motion.button
                                              whileHover={{ scale: 1.05 }}
                                              whileTap={{ scale: 0.95 }}
                                              onClick={() => handleIndividualEscalate(ticket.id)}
                                              className="px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700 transition-colors flex items-center gap-1"
                                              title="Escalate ticket"
                                            >
                                              <ArrowUp className="w-3 h-3" />
                                              Escalate
                                            </motion.button>
                                            <motion.button
                                              whileHover={{ scale: 1.05 }}
                                              whileTap={{ scale: 0.95 }}
                                              onClick={() => handleIndividualClose(ticket.id)}
                                              className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700 transition-colors flex items-center gap-1"
                                              title="Close ticket"
                                            >
                                              <CheckCircle2 className="w-3 h-3" />
                                              Close
                                            </motion.button>
                                          </>
                                        )}
                                        {ticket.status === 'closed' && (
                                          <span className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                            Closed
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Pagination */}
                {filteredAndSortedTickets.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    pageSize={itemsPerPage}
                    totalItems={totalItems}
                    pageSizeOptions={[10, 20, 30, 50, 100]}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    label="tickets"
                    className="px-4 py-3 border-t border-gray-200 dark:border-gray-700"
                  />
                )}
              </ComponentCard>
            </div>
          </div>
        </div>

        {/* Assignment Modal */}
        <AnimatePresence>
          {showAssignModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => !assigningTickets && setShowAssignModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                      <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Assign Tickets
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''} selected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !assigningTickets && setShowAssignModal(false)}
                    disabled={assigningTickets}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Agent
                  </label>
                  <Select
                    options={[
                      { value: '', label: 'Select an agent...' },
                      ...availableEmployees.map(emp => ({
                        value: emp.id,
                        label: `${emp.full_name}${emp.email ? ` (${emp.email})` : ''}`
                      }))
                    ]}
                    defaultValue={selectedEmployeeId}
                    onChange={setSelectedEmployeeId}
                    placeholder="Select an agent..."
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                  />
                  {availableEmployees.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                      No agents available for assignment. Please ensure users have the &quot;agent&quot; role to assign tickets.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAssignTickets}
                    disabled={!selectedEmployeeId || assigningTickets || availableEmployees.length === 0}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {assigningTickets ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Assign Tickets
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowAssignModal(false)}
                    disabled={assigningTickets}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Ticket Confirmation Modal */}
        <AnimatePresence>
          {showCloseModal && ticketToClose && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => !closingTicket && setShowCloseModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Close Ticket
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to close this ticket?
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !closingTicket && setShowCloseModal(false)}
                    disabled={closingTicket}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {ticketToClose && (() => {
                  const ticket = tickets.find(t => t.id === ticketToClose);
                  return ticket ? (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ticket ID: <span className="font-semibold">{ticket.ticket_number}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Subject: <span className="font-medium">{ticket.subject}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Requester: <span className="font-medium">{ticket.requester_name}</span>
                      </p>
                    </div>
                  ) : null;
                })()}

                <div className="flex gap-3">
                  <Button
                    onClick={handleConfirmClose}
                    disabled={closingTicket}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {closingTicket ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Closing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Close Ticket
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowCloseModal(false)}
                    disabled={closingTicket}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Escalation Modal */}
        <AnimatePresence>
          {showEscalateModal && ticketToEscalate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => !escalatingTicket && setShowEscalateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <ArrowUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Escalate Ticket
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Increase ticket priority and severity
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !escalatingTicket && setShowEscalateModal(false)}
                    disabled={escalatingTicket}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {ticketToEscalate && (() => {
                  const ticket = tickets.find(t => t.id === ticketToEscalate);
                  return ticket ? (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ticket ID: <span className="font-semibold">{ticket.ticket_number}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Current Severity: <span className="font-medium capitalize">{ticket.severity || 'Low'}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Subject: <span className="font-medium">{ticket.subject}</span>
                      </p>
                    </div>
                  ) : null;
                })()}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Severity Level
                    </label>
                    <select
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value)}
                      disabled={escalatingTicket}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Select the severity level to escalate this ticket to
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Escalation Reason (Optional)
                    </label>
                    <textarea
                      value={escalationReason}
                      onChange={(e) => setEscalationReason(e.target.value)}
                      disabled={escalatingTicket}
                      placeholder="Enter reason for escalation..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleConfirmEscalate}
                    disabled={escalatingTicket || !selectedSeverity}
                    className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-4 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {escalatingTicket ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                        Escalating...
                      </>
                    ) : (
                      <>
                        <ArrowUp className="w-4 h-4 mr-2 inline" />
                        Escalate Ticket
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => !escalatingTicket && setShowEscalateModal(false)}
                    disabled={escalatingTicket}
                    variant="outline"
                    className="px-4 py-2.5 rounded-lg font-semibold border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
