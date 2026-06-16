'use client';

import React from 'react';
import { 
  Clock, 
  User, 
  ArrowRight,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AgentTicket } from '@/services/agentTicketService';
import { Card } from '@/components/ui/card';
import SLAIndicator from './SLAIndicator';

interface TicketCardProps {
  ticket: AgentTicket;
  onClick: () => void;
  onTicketIdClick?: () => void;
  onStatusChange?: (ticketId: string, newStatus: string) => void;
}

export default function TicketCard({ ticket, onClick, onTicketIdClick }: TicketCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const ticketId = ticket.display_id || ticket.ticket_id || ticket.id;
  const priorityValue = String(ticket.priority || 'low').toLowerCase();
  const statusValue = String(ticket.status || 'open').toLowerCase();
  const requesterName =
    ticket.requester_name ||
    (ticket as unknown as Record<string, string | undefined>).name ||
    (ticket as unknown as Record<string, string | undefined>).customer_name ||
    (ticket as unknown as Record<string, string | undefined>).contact_name ||
    'Unknown';
  const ticketCategory =
    ticket.category ||
    ticket.issue_type ||
    (ticket as unknown as Record<string, string | undefined>).issue ||
    (ticket as unknown as Record<string, string | undefined>).category_name;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card 
        className="p-4 hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {ticket.subject || 'No Subject'}
                  </h3>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTicketIdClick?.();
                    }}
                    className="text-sm font-mono text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  >
                    #{ticketId}
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {ticket.description || 'No description'}
                </p>
              </div>
            </div>

            {/* Tags and Metadata */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Priority */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(priorityValue)}`}>
                {priorityValue.toUpperCase()}
              </span>

              {/* Status */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(statusValue)}`}>
                {statusValue.replace('_', ' ').toUpperCase()}
              </span>

              {/* Category */}
              {ticketCategory && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  {ticketCategory}
                </span>
              )}
            </div>

            {/* Footer Info */}
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                {/* Requester */}
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span className="truncate">{requesterName}</span>
                </div>

                {/* Updated At */}
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Updated {formatDate(ticket.updated_at)}</span>
                </div>

                {/* Created At */}
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created {formatDate(ticket.created_at)}</span>
                </div>
              </div>

              {/* SLA Indicator */}
              {ticket.sla_status && (
                <SLAIndicator slaStatus={ticket.sla_status} />
              )}
            </div>
          </div>

          {/* Action Arrow */}
          <div className="ml-4 flex items-center">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

