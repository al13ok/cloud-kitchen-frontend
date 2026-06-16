'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  User, 
  Paperclip, 
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  XCircle
} from 'lucide-react';
import { Ticket } from '@/types/servicedesk';
import { formatDistanceToNow } from 'date-fns';

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  showAssignee?: boolean;
  showSLA?: boolean;
  className?: string;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onClick,
  showAssignee = true,
  showSLA = true,
  className = ''
}) => {
  // Priority styling
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-400',
          icon: 'bg-red-100 dark:bg-red-800/50',
          dot: 'bg-red-500'
        };
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-400',
          icon: 'bg-orange-100 dark:bg-orange-800/50',
          dot: 'bg-orange-500'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-700 dark:text-yellow-400',
          icon: 'bg-yellow-100 dark:bg-yellow-800/50',
          dot: 'bg-yellow-500'
        };
      case 'low':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-400',
          icon: 'bg-green-100 dark:bg-green-800/50',
          dot: 'bg-green-500'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          text: 'text-gray-700 dark:text-gray-400',
          icon: 'bg-gray-100 dark:bg-gray-700',
          dot: 'bg-gray-500'
        };
    }
  };

  // Status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          text: 'text-blue-700 dark:text-blue-400',
          icon: <Play className="w-4 h-4" />
        };
      case 'pending':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          text: 'text-yellow-700 dark:text-yellow-400',
          icon: <Pause className="w-4 h-4" />
        };
      case 'in_progress':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          text: 'text-purple-700 dark:text-purple-400',
          icon: <Clock className="w-4 h-4" />
        };
      case 'resolved':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          text: 'text-green-700 dark:text-green-400',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'closed':
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          text: 'text-gray-700 dark:text-gray-400',
          icon: <XCircle className="w-4 h-4" />
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          text: 'text-gray-700 dark:text-gray-400',
          icon: <AlertCircle className="w-4 h-4" />
        };
    }
  };

  // SLA status styling
  const getSLAStatusStyle = (slaStatus: Ticket['sla_status']) => {
    if (!slaStatus || !slaStatus.resolution_due) return { color: 'text-gray-500', bg: 'bg-gray-100' };
    
    const now = new Date();
    const resolutionDue = new Date(slaStatus.resolution_due);
    const timeLeft = resolutionDue.getTime() - now.getTime();
    const hoursLeft = timeLeft / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      return { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' };
    } else if (hoursLeft < 24) {
      return { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' };
    } else {
      return { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
    }
  };

  const priorityStyle = getPriorityStyle(ticket.priority);
  const statusStyle = getStatusStyle(ticket.status);
  const slaStyle = getSLAStatusStyle(ticket.sla_status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-0
        shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer
        hover:bg-white/90 dark:hover:bg-gray-800/90 group overflow-hidden relative
        ${className}
      `}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:scale-110 transition-transform duration-300"></div>
      <div className="p-6 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                #{ticket.ticket_number}
              </span>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityStyle.bg} ${priorityStyle.text} shadow-sm`}>
                {ticket.priority.toUpperCase()}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1 shadow-sm`}>
                {statusStyle.icon}
                {ticket.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate mb-2">
              {ticket.subject}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
          {ticket.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-lg">
              <User className="w-4 h-4" />
              <span className="font-medium">{ticket.requester_name}</span>
            </div>
            {showAssignee && ticket.assignee_name && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-700 dark:text-blue-300">{ticket.assignee_name}</span>
              </div>
            )}
            {ticket.attachments && ticket.attachments > 0 && (
              <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-lg">
                <Paperclip className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-purple-700 dark:text-purple-300">{ticket.attachments}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-lg">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Tags */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {ticket.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium shadow-sm"
              >
                {tag}
              </span>
            ))}
            {ticket.tags.length > 3 && (
              <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium shadow-sm">
                +{ticket.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* SLA Status */}
        {showSLA && ticket.sla_status && (
          <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">SLA Status</span>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${slaStyle.bg} ${slaStyle.color} shadow-sm`}>
                {ticket.sla_status.status === 'breached' ? 'BREACHED' : 
                 ticket.sla_status.status === 'on_time' ? 'ON TIME' : 
                 ticket.sla_status.status === 'at_risk' ? 'AT RISK' : 'PENDING'}
              </div>
            </div>
            {ticket.sla_status.resolution_due && (
              <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                <span className="font-medium">Due:</span> {formatDistanceToNow(new Date(ticket.sla_status.resolution_due), { addSuffix: true })}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TicketCard;
