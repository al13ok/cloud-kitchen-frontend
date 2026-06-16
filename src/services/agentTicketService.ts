import { BACKEND_URL, getAuthHeaders } from '@/utils/api';

// Types
export interface AgentTicket {
  id: string;
  _id?: string;
  ticket_id?: string;
  display_id?: string;
  subject: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
  requester_id: string;
  requester_name: string;
  requester_email?: string;
  assignee_id?: string;
  assignee_email?: string;
  assignee_name?: string;
  category?: string;
  issue_type?: string;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    uploaded_at: string;
  }>;
  tags?: string[];
  created_at: string;
  updated_at: string;
  sla_status?: {
    status: 'pending' | 'on_time' | 'at_risk' | 'breached';
    resolution_due?: string;
    first_response_due?: string;
  };
  first_response_time?: number; // in minutes
  resolution_time?: number; // in minutes
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  message: string;
  sender_id?: string;
  sender_name?: string;
  sender?: string;
  sender_email?: string;
  sender_type: 'agent' | 'customer' | 'admin' | 'staff';
  created_at: string;
  attachments?: Array<{
    id?: string;
    filename?: string;
    url?: string;
  }>;
  status?: string;
  status_changed_at?: string;
}

export interface InternalNote {
  id: string;
  ticket_id: string;
  note: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  is_private?: boolean;
}

export interface AgentAnalytics {
  total_assigned: number;
  tickets_resolved: number;
  tickets_open: number;
  tickets_pending: number;
  tickets_in_progress: number;
  avg_first_response_time: number; // in minutes
  avg_resolution_time: number; // in hours
  sla_breach_count: number;
  sla_compliance_rate: number; // percentage
  category_breakdown: Array<{
    category: string;
    count: number;
  }>;
  priority_breakdown: Array<{
    priority: string;
    count: number;
  }>;
  resolution_trend: Array<{
    date: string;
    resolved: number;
  }>;
}

export interface AgentNotification {
  id: string;
  type: 'ticket_assigned' | 'ticket_updated' | 'sla_breach' | 'status_change' | 'new_reply';
  title: string;
  message: string;
  ticket_id?: string;
  ticket_subject?: string;
  is_read: boolean;
  created_at: string;
}

class AgentTicketService {
  private baseUrl: string;
  private readonly ticketEndpoints = ['/api/v1/helpdesk/tickets'];

  constructor() {
    this.baseUrl = BACKEND_URL;
  }

  private toString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
  }

  private toISOString(value: unknown): string {
    const parsed = value ? new Date(value as string) : new Date();
    const validDate = isNaN(parsed.getTime()) ? new Date() : parsed;
    return validDate.toISOString();
  }

  private normalizePriority(severity: string): AgentTicket['priority'] {
    const normalized = severity.toLowerCase();
    if (normalized.includes('critical') || normalized.includes('urgent')) return 'urgent';
    if (normalized.includes('high')) return 'high';
    if (normalized.includes('low')) return 'low';
    return 'medium';
  }

  private normalizeStatus(status: string): AgentTicket['status'] {
    const normalized = status.toLowerCase().replace(/ /g, '_');
    const allowed: AgentTicket['status'][] = ['open', 'pending', 'in_progress', 'resolved', 'closed'];
    return (allowed.includes(normalized as AgentTicket['status']) ? normalized : 'open') as AgentTicket['status'];
  }

  private normalizeTicket(raw: Record<string, unknown>): AgentTicket | null {
    const id = this.toString(raw._id ?? raw.id ?? raw.ticket_id ?? raw.display_id);
    if (!id) {
      return null;
    }

    const subject =
      this.toString(raw.subject) ||
      this.toString(raw.issue) ||
      this.toString(raw.issue_type) ||
      'General Inquiry';

    const message = this.toString(raw.message);
    const description = message || `${this.toString(raw.issue_type)} ${this.toString(raw.issue)}`.trim() || subject;

    const severity = this.toString(raw.severity);
    const priority = this.normalizePriority(severity);

    const status = this.normalizeStatus(this.toString(raw.status) || 'open');

    const requesterName =
      this.toString(raw.requester_name) || this.toString(raw.customer_name) || this.toString(raw.name) || 'Unknown';
    const requesterEmail = this.toString(raw.requester_email) || this.toString(raw.customer_email) || this.toString(raw.email);
    const requesterId = this.toString(raw.requester_id) || requesterEmail || requesterName;

    const fallbackAssignedValue = this.toString(raw.assigned_to) || this.toString(raw.assign_to);
    const assigneeName =
      this.toString(raw.assignee_name) ||
      this.toString(raw.assigned_to_name) ||
      fallbackAssignedValue;
    const assigneeEmail =
      this.toString(raw.assignee_email) ||
      this.toString(raw.assigned_to_email) ||
      fallbackAssignedValue ||
      undefined;
    const assigneeId =
      this.toString(raw.assignee_id) ||
      this.toString(raw.assigned_to_id) ||
      this.toString(raw.assign_to_id) ||
      assigneeEmail ||
      assigneeName ||
      undefined;

    const ticketId = this.toString(raw.ticket_id) || id;
    const displayId = this.toString(raw.display_id) || ticketId;

    const created_at = this.toISOString(raw.created_at);
    const updated_at = this.toISOString(raw.updated_at ?? raw.modified_at ?? raw.created_at);

    const first_response_time =
      typeof raw.first_response_time === 'number'
        ? raw.first_response_time
        : typeof raw.first_response_time === 'string'
        ? Number(raw.first_response_time)
        : undefined;

    const resolution_time =
      typeof raw.resolution_time === 'number'
        ? raw.resolution_time
        : typeof raw.resolution_time === 'string'
        ? Number(raw.resolution_time)
        : undefined;

    let slaStatus: AgentTicket['sla_status'] | undefined;
    if (typeof raw.sla_status === 'object' && raw.sla_status !== null) {
      const statusValue = this.toString((raw.sla_status as Record<string, unknown>).status || '')
        .toLowerCase()
        .replace(/ /g, '_');
      const allowedStatuses: Array<NonNullable<AgentTicket['sla_status']>['status']> = [
        'pending',
        'on_time',
        'at_risk',
        'breached',
      ];
      slaStatus = {
        status: allowedStatuses.includes(statusValue as (typeof allowedStatuses)[number])
          ? (statusValue as (typeof allowedStatuses)[number])
          : 'pending',
        resolution_due: this.toString((raw.sla_status as Record<string, unknown>).resolution_due),
        first_response_due: this.toString((raw.sla_status as Record<string, unknown>).first_response_due),
      };
    }

    return {
      id,
      _id: id,
      ticket_id: ticketId,
      display_id: displayId,
      subject,
      description,
      priority,
      status,
      requester_id: requesterId,
      requester_name: requesterName,
      requester_email: requesterEmail || undefined,
      assignee_id: assigneeId,
      assignee_email: assigneeEmail || undefined,
      assignee_name: assigneeName || undefined,
      category: this.toString(raw.category),
      issue_type: this.toString(raw.issue_type),
      created_at,
      updated_at,
      attachments: Array.isArray(raw.attachments) ? (raw.attachments as AgentTicket['attachments']) : undefined,
      tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : undefined,
      sla_status: slaStatus,
      first_response_time,
      resolution_time,
    };
  }

  private async fetchTicketsFromApi(): Promise<Record<string, unknown>[]> {
    const aggregated: Record<string, unknown>[] = [];
    const headers = getAuthHeaders();

    for (const endpoint of this.ticketEndpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          console.warn(`Agent ticket service: ${endpoint} responded with ${response.status}`);
          continue;
        }

        const payload = await response.json();
        const tickets = Array.isArray(payload) ? payload : payload?.tickets || payload?.data || [];
        if (Array.isArray(tickets)) {
          aggregated.push(...tickets);
        }
      } catch (error) {
        console.warn(`Agent ticket service: failed to fetch ${endpoint}`, error);
      }
    }

    return aggregated;
  }

  private async fetchNormalizedTickets(): Promise<AgentTicket[]> {
    const rawTickets = await this.fetchTicketsFromApi();
    return rawTickets
      .map(ticket => this.normalizeTicket(ticket as Record<string, unknown>))
      .filter((ticket): ticket is AgentTicket => Boolean(ticket));
  }

  private average(values: number[], divisor?: number): number {
    if (!values.length) return 0;
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / (divisor ?? values.length);
  }

  private filterTicketsByDateRange(
    tickets: AgentTicket[],
    startDate?: string,
    endDate?: string
  ): AgentTicket[] {
    if (!startDate && !endDate) return tickets;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return tickets.filter(ticket => {
      const created = new Date(ticket.created_at);
      if (start && created < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (created > endOfDay) return false;
      }
      return true;
    });
  }

  private buildAnalyticsFromTickets(tickets: AgentTicket[]): AgentAnalytics {
    const totalAssigned = tickets.length;
    const ticketsResolved = tickets.filter(ticket => ['resolved', 'closed'].includes(ticket.status)).length;
    const ticketsOpen = tickets.filter(ticket => ticket.status === 'open').length;
    const ticketsPending = tickets.filter(ticket => ticket.status === 'pending').length;
    const ticketsInProgress = tickets.filter(ticket => ticket.status === 'in_progress').length;

    const firstResponseValues = tickets
      .map(ticket => ticket.first_response_time)
      .filter((value): value is number => typeof value === 'number' && !isNaN(value));
    const avgFirstResponseTime = this.average(firstResponseValues);

    const resolutionValues = tickets
      .map(ticket => ticket.resolution_time)
      .filter((value): value is number => typeof value === 'number' && !isNaN(value));
    const avgResolutionHours = this.average(resolutionValues) / 60;

    const slaBreaches = tickets.filter(ticket => ticket.sla_status?.status === 'breached').length;
    const slaComplianceRate = totalAssigned ? ((totalAssigned - slaBreaches) / totalAssigned) * 100 : 0;

    const categoryBreakdownMap = new Map<string, number>();
    tickets.forEach(ticket => {
      const category = ticket.category || ticket.issue_type || 'General';
      categoryBreakdownMap.set(category, (categoryBreakdownMap.get(category) || 0) + 1);
    });

    const priorityBreakdownMap = new Map<string, number>();
    tickets.forEach(ticket => {
      priorityBreakdownMap.set(ticket.priority, (priorityBreakdownMap.get(ticket.priority) || 0) + 1);
    });

    const resolutionTrendMap = new Map<string, number>();
    tickets
      .filter(ticket => ['resolved', 'closed'].includes(ticket.status))
      .forEach(ticket => {
        const dateKey = ticket.updated_at.slice(0, 10);
        resolutionTrendMap.set(dateKey, (resolutionTrendMap.get(dateKey) || 0) + 1);
      });

    return {
      total_assigned: totalAssigned,
      tickets_resolved: ticketsResolved,
      tickets_open: ticketsOpen,
      tickets_pending: ticketsPending,
      tickets_in_progress: ticketsInProgress,
      avg_first_response_time: avgFirstResponseTime,
      avg_resolution_time: Number.isFinite(avgResolutionHours) ? Number(avgResolutionHours.toFixed(2)) : 0,
      sla_breach_count: slaBreaches,
      sla_compliance_rate: Number(slaComplianceRate.toFixed(2)),
      category_breakdown: Array.from(categoryBreakdownMap.entries()).map(([category, count]) => ({
        category,
        count,
      })),
      priority_breakdown: Array.from(priorityBreakdownMap.entries()).map(([priority, count]) => ({
        priority,
        count,
      })),
      resolution_trend: Array.from(resolutionTrendMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([date, resolved]) => ({ date, resolved })),
    };
  }

  /**
   * Get all tickets assigned to the current agent
   */
  async getAssignedTickets(params?: {
    status?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
    assigneeId?: string;
    assigneeEmail?: string;
  }): Promise<{ tickets: AgentTicket[]; total: number }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const normalizedAssigneeId = params?.assigneeId?.trim().toLowerCase();
    const normalizedAssigneeEmail = params?.assigneeEmail?.trim().toLowerCase();
    const normalizedSearch = params?.search?.trim().toLowerCase();
    const normalizedStatus = params?.status?.trim().toLowerCase();
    const normalizedPriorityRaw = params?.priority?.trim().toLowerCase();
    const normalizedPriority = normalizedPriorityRaw && normalizedPriorityRaw !== 'all' 
      ? normalizedPriorityRaw as AgentTicket['priority']
      : undefined;

    try {
      let tickets = await this.fetchNormalizedTickets();

      if (normalizedStatus && normalizedStatus !== 'all') {
        tickets = tickets.filter(ticket => ticket.status === this.normalizeStatus(normalizedStatus));
      }

      if (normalizedPriority) {
        tickets = tickets.filter(ticket => ticket.priority === normalizedPriority);
      }

      // Filter by assignee email/id
      if (normalizedAssigneeId || normalizedAssigneeEmail) {
        tickets = tickets.filter(ticket => {
          const ticketAssignee = (ticket.assignee_id || '').trim().toLowerCase();
          const ticketAssigneeEmail = (ticket.assignee_email || ticket.assignee_name || '').trim().toLowerCase();

          const matchesId = normalizedAssigneeId && ticketAssignee === normalizedAssigneeId;
          const matchesEmail =
            normalizedAssigneeEmail &&
            (ticketAssigneeEmail === normalizedAssigneeEmail || ticketAssignee === normalizedAssigneeEmail);

          return Boolean(matchesId || matchesEmail);
        });
      }

      // Additional client-side search filter
      if (normalizedSearch) {
        tickets = tickets.filter(ticket => {
          const subject = (ticket.subject || '').toLowerCase();
          const requester = (ticket.requester_name || '').toLowerCase();
          const ticketId = (ticket.ticket_id || ticket.display_id || '').toLowerCase();
          const description = (ticket.description || '').toLowerCase();
          return (
            subject.includes(normalizedSearch) ||
            requester.includes(normalizedSearch) ||
            ticketId.includes(normalizedSearch) ||
            description.includes(normalizedSearch)
          );
        });
      }

      const total = tickets.length;
      const startIndex = (page - 1) * limit;
      const paginatedTickets = tickets.slice(startIndex, startIndex + limit);

      return { tickets: paginatedTickets, total };
    } catch (error) {
      console.error('Error fetching assigned tickets:', error);
      throw error;
    }
  }

  /**
   * Get a specific ticket by ID
   */
  async getTicketById(ticketId: string): Promise<AgentTicket> {
    const url = `${this.baseUrl}/api/v1/helpdesk/tickets/${ticketId}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Ticket not found' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  }

  /**
   * Add a reply/comment to a ticket
   */
  async addReply(
    ticketId: string,
    message: string,
    attachments?: File[],
    attachmentTicketId?: string
  ): Promise<{
    message: string;
    thread_id: string;
    ticket_id: string;
  }> {
    const url = `${this.baseUrl}/api/v1/helpdesk/customer/thread`;
    const headers = {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    };

    try {
      let uploadedAttachments: Array<{ id: string; filename: string; url: string }> = [];
      const attachmentTargetId = attachmentTicketId ?? ticketId;
      if (attachments && attachments.length > 0) {
        uploadedAttachments = await this.uploadAttachments(attachmentTargetId, attachments);
      }

      let enrichedMessage = message;
      if (uploadedAttachments.length > 0) {
        const attachmentSummary = uploadedAttachments
          .map(file => `• ${file.filename}: ${file.url}`)
          .join('\n');
        enrichedMessage = `${message}\n\nAttachments:\n${attachmentSummary}`;
      }

      const payload = {
        ticket_id: ticketId,
        sender_type: 'admin',
        sender_id: 'agent-dashboard',
        message: enrichedMessage,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to add reply' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        message: enrichedMessage,
        thread_id: data.id || ticketId,
        ticket_id: ticketId,
      };
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  }

  /**
   * Add an internal note to a ticket
   */
  async addInternalNote(ticketId: string, note: string, isPrivate: boolean = true): Promise<InternalNote> {
    const url = `${this.baseUrl}/api/v1/helpdesk/tickets/${ticketId}/internal-note`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ note, is_private: isPrivate }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to add internal note' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding internal note:', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateStatus(ticketId: string, status: string): Promise<AgentTicket> {
    const url = `${this.baseUrl}/api/v1/helpdesk/tickets/${ticketId}/status`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to update status' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  /**
   * Update ticket priority
   */
  async updatePriority(ticketId: string, priority: string): Promise<AgentTicket> {
    const url = `${this.baseUrl}/api/v1/helpdesk/tickets/${ticketId}/priority`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ priority }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to update priority' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating priority:', error);
      throw error;
    }
  }

  /**
   * Upload attachments to a ticket
   */
  async uploadAttachments(ticketId: string, files: File[]): Promise<Array<{ id: string; filename: string; url: string }>> {
    const url = `${this.baseUrl}/api/v1/helpdesk/tickets/${ticketId}/attachments`;
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const headers = getAuthHeaders();
    delete (headers as Record<string, unknown>)['Content-Type'];

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to upload attachments' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.attachments || data.files || [];
    } catch (error) {
      console.error('Error uploading attachments:', error);
      throw error;
    }
  }

  /**
   * Get ticket thread/conversation
   */
  async getTicketThread(ticketId: string): Promise<TicketReply[]> {
    const url = `${this.baseUrl}/api/v1/helpdesk/customer/thread/${ticketId}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to fetch thread' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const raw = await response.json();
      const list = Array.isArray(raw) ? raw : (raw?.thread || raw?.messages || []);

      return list.map((rawItem: Record<string, unknown>, index: number) => {
        const senderTypeValue =
          (typeof rawItem.sender_type === 'string' && rawItem.sender_type) ||
          (typeof rawItem.sender === 'string' && rawItem.sender) ||
          '';
        const senderType = senderTypeValue.toLowerCase();
        const normalizedSenderType: TicketReply['sender_type'] =
          senderType === 'agent' || senderType === 'admin' || senderType === 'staff'
            ? 'agent'
            : 'customer';
        const attachments = Array.isArray(rawItem.attachments)
          ? (rawItem.attachments as TicketReply['attachments'])
          : [];
        const createdAt =
          (typeof rawItem.created_at === 'string' && rawItem.created_at) ||
          (typeof rawItem.timestamp === 'string' && rawItem.timestamp) ||
          new Date().toISOString();

        return {
          id:
            (typeof rawItem.id === 'string' && rawItem.id) ||
            (typeof rawItem._id === 'string' && rawItem._id) ||
            `${ticketId}-${index}`,
          ticket_id: (typeof rawItem.ticket_id === 'string' && rawItem.ticket_id) || ticketId,
          message: (typeof rawItem.message === 'string' && rawItem.message) || '',
          sender_id:
            (typeof rawItem.sender_id === 'string' && rawItem.sender_id) ||
            (typeof rawItem.sender === 'string' && rawItem.sender) ||
            '',
          sender_name:
            (typeof rawItem.sender_name === 'string' && rawItem.sender_name) ||
            (typeof rawItem.sender === 'string' && rawItem.sender) ||
            (normalizedSenderType === 'agent' ? 'Agent' : 'Customer'),
          sender: typeof rawItem.sender === 'string' ? rawItem.sender : undefined,
          sender_email: typeof rawItem.sender_email === 'string' ? rawItem.sender_email : undefined,
          sender_type: normalizedSenderType,
          created_at: createdAt,
          attachments,
          status: typeof rawItem.status === 'string' ? rawItem.status : undefined,
          status_changed_at:
            typeof rawItem.status_changed_at === 'string' ? rawItem.status_changed_at : undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching thread:', error);
      throw error;
    }
  }

  /**
   * Get internal notes for a ticket
   */
  async getInternalNotes(ticketId: string): Promise<InternalNote[]> {
    const url = `${this.baseUrl}/api/v1/helpdesk/tickets/${ticketId}/internal-notes`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to fetch internal notes' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : (data.notes || []);
    } catch (error) {
      console.error('Error fetching internal notes:', error);
      throw error;
    }
  }

  /**
   * Request reassignment to admin
   */
  async requestReassignment(ticketId: string, reason: string): Promise<{ message: string }> {
    const url = `${this.baseUrl}/api/v1/helpdesk/tickets/${ticketId}/reassign-request`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to request reassignment' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error requesting reassignment:', error);
      throw error;
    }
  }

  /**
   * Mark ticket as resolved
   */
  async markAsResolved(ticketId: string, resolution_notes?: string): Promise<AgentTicket> {
    const url = `${this.baseUrl}/api/v1/helpdesk/tickets/${ticketId}/resolve`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ resolution_notes }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to resolve ticket' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error resolving ticket:', error);
      throw error;
    }
  }

  /**
   * Get agent analytics
   */
  async getAgentAnalytics(params?: {
    start_date?: string;
    end_date?: string;
    assigneeId?: string;
    assigneeEmail?: string;
  }): Promise<AgentAnalytics> {
    try {
      let tickets = await this.fetchNormalizedTickets();
      
      // Filter by assignee if provided
      const normalizedAssigneeId = params?.assigneeId?.trim().toLowerCase();
      const normalizedAssigneeEmail = params?.assigneeEmail?.trim().toLowerCase();
      
      if (normalizedAssigneeId || normalizedAssigneeEmail) {
        tickets = tickets.filter(ticket => {
          const ticketAssignee = (ticket.assignee_id || '').trim().toLowerCase();
          const ticketAssigneeEmail = (ticket.assignee_email || ticket.assignee_name || '').trim().toLowerCase();

          const matchesId = normalizedAssigneeId && ticketAssignee === normalizedAssigneeId;
          const matchesEmail =
            normalizedAssigneeEmail &&
            (ticketAssigneeEmail === normalizedAssigneeEmail || ticketAssignee === normalizedAssigneeEmail);

          return Boolean(matchesId || matchesEmail);
        });
      }
      
      // Filter by date range
      const filteredTickets = this.filterTicketsByDateRange(tickets, params?.start_date, params?.end_date);
      return this.buildAnalyticsFromTickets(filteredTickets);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  /**
   * Get agent notifications
   */
  async getNotifications(params?: {
    unread_only?: boolean;
    limit?: number;
    assigneeId?: string;
    assigneeEmail?: string;
  }): Promise<AgentNotification[]> {
    const limit = params?.limit ?? 10;
    try {
      let tickets = await this.fetchNormalizedTickets();
      
      // Filter by assignee if provided
      const normalizedAssigneeId = params?.assigneeId?.trim().toLowerCase();
      const normalizedAssigneeEmail = params?.assigneeEmail?.trim().toLowerCase();
      
      if (normalizedAssigneeId || normalizedAssigneeEmail) {
        tickets = tickets.filter(ticket => {
          const ticketAssignee = (ticket.assignee_id || '').trim().toLowerCase();
          const ticketAssigneeEmail = (ticket.assignee_email || ticket.assignee_name || '').trim().toLowerCase();

          const matchesId = normalizedAssigneeId && ticketAssignee === normalizedAssigneeId;
          const matchesEmail =
            normalizedAssigneeEmail &&
            (ticketAssigneeEmail === normalizedAssigneeEmail || ticketAssignee === normalizedAssigneeEmail);

          return Boolean(matchesId || matchesEmail);
        });
      }
      
      const sorted = [...tickets].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      return sorted.slice(0, limit).map((ticket, index) => {
        const resolved = ['resolved', 'closed'].includes(ticket.status);
        return {
          id: `${ticket.id}-notif-${index}`,
          type: resolved ? 'ticket_updated' : 'ticket_assigned',
          title: resolved ? 'Ticket updated' : 'New ticket assignment',
          message: resolved
            ? `Ticket ${ticket.display_id || ticket.ticket_id || ticket.subject} was updated.`
            : `Ticket ${ticket.display_id || ticket.ticket_id || ticket.subject} is waiting for your action.`,
          ticket_id: ticket.ticket_id ?? ticket.id,
          ticket_subject: ticket.subject,
          is_read: params?.unread_only ? false : false,
          created_at: ticket.updated_at,
        };
      });
    } catch (error) {
      console.error('Error building notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async markNotificationAsRead(_notificationId: string): Promise<void> {
    // Notifications are derived client-side. No-op for compatibility.
    return;
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    // Notifications are derived client-side. No-op for compatibility.
    return;
  }

  /**
   * Get knowledge base suggestions for a ticket
   */
  async getKnowledgeBaseSuggestions(ticketId: string): Promise<Array<{
    id: string;
    title: string;
    content: string;
    relevance_score: number;
  }>> {
    const url = `${this.baseUrl}/api/v1/helpdesk/tickets/${ticketId}/kb-suggestions`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // This endpoint might not exist, return empty array
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : (data.suggestions || []);
    } catch {
      // Silently fail for KB suggestions as it's optional
      return [];
    }
  }
}

// Export singleton instance
export const agentTicketService = new AgentTicketService();
export default agentTicketService;

