'use client';
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { 
  AlertTriangle, 
  ArrowUpCircle, 
  Clock, 
  User,
  CheckCircle,
  XCircle 
} from 'lucide-react';
import { EscalatedTicket } from '@/services/slaService';

interface EscalatedTicketsPanelProps {
  tickets: EscalatedTicket[];
  loading?: boolean;
}

const escalationLevelConfig = {
  level_1: { label: 'Level 1 - Team Lead', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '👤' },
  level_2: { label: 'Level 2 - Manager', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '👔' },
  level_3: { label: 'Level 3 - Director', color: 'bg-red-100 text-red-800 border-red-300', icon: '🎯' },
  level_4: { label: 'Level 4 - CTO', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '⚡' },
};

const priorityConfig = {
  critical: { color: 'bg-red-500 text-white', label: 'Critical' },
  high: { color: 'bg-orange-500 text-white', label: 'High' },
  medium: { color: 'bg-yellow-500 text-white', label: 'Medium' },
  low: { color: 'bg-green-500 text-white', label: 'Low' },
};

export default function EscalatedTicketsPanel({ tickets, loading }: EscalatedTicketsPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5" />
            Escalated Tickets
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5" />
            Escalated Tickets
          </h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No escalated tickets at this time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Count by escalation level
  const levelCounts = tickets.reduce((acc, ticket) => {
    acc[ticket.escalation_level] = (acc[ticket.escalation_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-red-500" />
            Escalated Tickets
            <span className="ml-2 px-2 py-0.5 text-sm rounded-full bg-red-100 text-red-800">
              {tickets.length}
            </span>
          </h3>
        </div>
        
        {/* Escalation Level Summary */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(levelCounts).map(([level, count]) => {
            const config = escalationLevelConfig[level as keyof typeof escalationLevelConfig];
            return (
              <div 
                key={level} 
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}
              >
                <span>{config.icon}</span>
                <span>{config.label.split(' - ')[1]}</span>
                <span className="ml-1 font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {tickets.map((ticket) => {
            const escalationConfig = escalationLevelConfig[ticket.escalation_level as keyof typeof escalationLevelConfig];
            const priorityConf = priorityConfig[ticket.priority as keyof typeof priorityConfig] || priorityConfig.medium;
            
            return (
              <div 
                key={ticket.ticket_id} 
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-primary">
                        {ticket.ticket_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConf.color}`}>
                        {priorityConf.label}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                      {ticket.subject || 'No subject'}
                    </p>
                  </div>
                </div>

                {/* Escalation Info */}
                <div className={`flex items-center gap-2 p-2 rounded-md mb-3 border ${escalationConfig.color}`}>
                  <ArrowUpCircle className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {escalationConfig.icon} {escalationConfig.label}
                    </p>
                    <p className="text-xs opacity-75 truncate">
                      Escalated to: {ticket.escalated_to}
                    </p>
                  </div>
                  <div className="text-xs opacity-75 flex-shrink-0">
                    {new Date(ticket.escalated_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Breach Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {ticket.sla_response_breached ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span>Response SLA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ticket.sla_resolution_breached ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span>Resolution SLA</span>
                  </div>
                </div>

                {/* Breach Count */}
                {ticket.breach_count > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{ticket.breach_count} breach{ticket.breach_count > 1 ? 'es' : ''} recorded</span>
                  </div>
                )}

                {/* Assignment */}
                <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Assigned: {ticket.assigned_to || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
