'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface AtRiskTicket {
  ticket_id: string;
  subject: string;
  priority: string;
  status: string;
  assignee?: string;
  created_at: string;
  sla_target_time: string;
  time_remaining: number;
  breach_in_minutes: number;
}

interface AtRiskTicketsPanelProps {
  tickets: AtRiskTicket[];
  loading?: boolean;
}

const formatTime = (minutes: number): string => {
  const absMinutes = Math.abs(minutes);
  if (absMinutes < 60) return `${Math.round(absMinutes)}m`;
  if (absMinutes < 1440) return `${Math.round(absMinutes / 60)}h`;
  return `${Math.round(absMinutes / 1440)}d`;
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getPriorityColor = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }
};

const getUrgencyLevel = (minutes: number): { level: string; color: string; bgColor: string } => {
  if (minutes < 30) {
    return { 
      level: 'Critical', 
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    };
  } else if (minutes < 120) {
    return { 
      level: 'High', 
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    };
  } else {
    return { 
      level: 'Medium', 
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
    };
  }
};

export const AtRiskTicketsPanel: React.FC<AtRiskTicketsPanelProps> = ({ 
  tickets, 
  loading = false
}) => {
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  if (loading) {
    return (
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">At-Risk Tickets</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">At-Risk Tickets</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">0 tickets</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">No tickets at risk of SLA breach</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">At-Risk Tickets</h3>
          </div>
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {tickets.map((ticket, index) => {
            const urgency = getUrgencyLevel(ticket.breach_in_minutes);
            const isExpanded = expandedTicket === ticket.ticket_id;

            return (
              <motion.div
                key={ticket.ticket_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${urgency.bgColor} border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all`}
                onClick={() => setExpandedTicket(isExpanded ? null : ticket.ticket_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                        #{ticket.ticket_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${urgency.color} bg-white dark:bg-gray-800`}>
                        {urgency.level} Risk
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {ticket.subject}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Breach in {formatTime(ticket.breach_in_minutes)}</span>
                      </div>
                      {ticket.assignee && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{ticket.assignee}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`text-right ${urgency.color}`}>
                      <div className="text-2xl font-bold">
                        {formatTime(ticket.breach_in_minutes)}
                      </div>
                      <div className="text-xs">remaining</div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600"
                    >
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Status:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {ticket.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Created:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">SLA Target:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {formatDate(ticket.sla_target_time)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                          View Ticket
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AtRiskTicketsPanel;
