// ServiceDesk Types

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
  requester_id: string;
  requester_name: string;
  assignee_id?: string;
  assignee_name?: string;
  attachments?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  sla_status?: {
    status: 'pending' | 'on_time' | 'at_risk' | 'breached';
    resolution_due?: string;
  };
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'agent' | 'customer' | 'employee';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DashboardMetrics {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  pending_tickets: number;
  sla_compliance: number;
  avg_resolution_time: number; // in hours
  customer_satisfaction: number; // 0-5 scale
}

