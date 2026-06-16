'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Search, 
  RefreshCw, 
  Loader2,
  MessageSquare,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { agentTicketService, AgentTicket } from '@/services/agentTicketService';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table';

export type TicketStatsSummary = {
  total: number;
  open: number;
  in_progress: number;
  pending: number;
  resolved: number;
};

export interface TicketSyncMeta {
  lastSynced: string;
  total: number;
  status?: 'success' | 'error';
  error?: string;
}

interface MyTicketsTabProps {
  onTicketIdClick?: (ticket: AgentTicket) => void;
  currentUserId?: string;
  currentUserEmail?: string;
  onStatsChange?: (stats: TicketStatsSummary) => void;
  onSyncMetaChange?: (meta: TicketSyncMeta) => void;
  refreshSignal?: number;
}

export default function MyTicketsTab({
  onTicketIdClick,
  currentUserId,
  currentUserEmail,
  onStatsChange,
  onSyncMetaChange,
  refreshSignal,
}: MyTicketsTabProps) {
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'priority'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const refreshReadyRef = useRef(false);

  const fetchTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await agentTicketService.getAssignedTickets({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        search: searchQuery || undefined,
        page: currentPage,
        limit: itemsPerPage,
        assigneeId: currentUserId,
        assigneeEmail: currentUserEmail,
      });

      setTickets(response.tickets);
      const syncedAt = new Date().toISOString();
      onSyncMetaChange?.({
        lastSynced: syncedAt,
        total: response.total,
        status: 'success',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tickets';
      setError(errorMessage);
      console.error('Error fetching tickets:', err);
      onSyncMetaChange?.({
        lastSynced: new Date().toISOString(),
        total: tickets.length,
        status: 'error',
        error: errorMessage,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    statusFilter,
    priorityFilter,
    searchQuery,
    currentPage,
    currentUserId,
    currentUserEmail,
    onSyncMetaChange,
    tickets.length,
  ]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (refreshSignal === undefined) return;
    if (!refreshReadyRef.current) {
      refreshReadyRef.current = true;
      return;
    }
    fetchTickets(true);
  }, [refreshSignal, fetchTickets]);

  const handleRefresh = () => {
    fetchTickets(true);
  };

  // Filter and sort tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.display_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.requester_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.requester_email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
      return matchesSearch && matchesStatus && matchesPriority;
  }).sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'created_at') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'updated_at') {
      comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    } else if (sortBy === 'priority') {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  }, [tickets, searchQuery, statusFilter, priorityFilter, sortBy, sortOrder]);

  // Pagination
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage, itemsPerPage]);

  const totalItems = filteredTickets.length;

  // Statistics
  const stats = useMemo<TicketStatsSummary>(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }), [tickets]);

  useEffect(() => {
    onStatsChange?.(stats);
  }, [stats, onStatsChange]);

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tickets by ID, subject, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as typeof sortBy);
              setSortOrder(order as typeof sortOrder);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="updated_at-desc">Recently Updated</option>
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="priority-desc">Priority (High to Low)</option>
            <option value="priority-asc">Priority (Low to High)</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tickets Table */}
      <Card className="p-0 overflow-hidden">
      {filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Tickets Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filters'
              : 'No tickets assigned to you yet'}
          </p>
          </div>
      ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <Table className="w-full">
                <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                  <TableRow className="hover:bg-transparent">
                    <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-24">
                      Ticket ID
                    </th>
                    <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-32">
                      Requester
                    </th>
                    <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-40">
                      Email
                    </th>
                    <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-48">
                      Subject
                    </th>
                    <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-24">
                      Priority
                    </th>
                    <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-24">
                      Status
                    </th>
                    <th 
                      onClick={() => {
                        setSortBy('created_at');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-28"
                    >
                      Date {sortBy === 'created_at' && (sortOrder === 'desc' ? <ArrowDown className="inline w-4 h-4 ml-1" /> : <ArrowUp className="inline w-4 h-4 ml-1" />)}
                    </th>
                    <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-24">
                      Actions
                    </th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTickets.map((ticket) => {
                    const ticketId = ticket.display_id || ticket.ticket_id || ticket.id || 'N/A';
                    const displayTicketId = ticketId.toString().startsWith('TKT-') ? ticketId.toString() : `TKT-CUST-${ticketId}`;
                    
                    const statusColors: Record<string, string> = {
                      open: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
                      pending: 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
                      in_progress: 'bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
                      resolved: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
                      closed: 'bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
                    };

                    const priorityColors: Record<string, string> = {
                      urgent: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
                      high: 'bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
                      medium: 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
                      low: 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
                    };
                    
                    return (
                      <TableRow
                        key={ticket.id || ticket._id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-violet-50/50 dark:hover:from-blue-900/10 dark:hover:to-violet-900/10 transition-all duration-200 group"
                      >
                        <td className="px-5 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onTicketIdClick) {
                                onTicketIdClick(ticket);
                              }
                            }}
                            className="font-bold underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            title="Click to open chat"
                          >
                            {displayTicketId}
                          </button>
                        </td>
                        <td className="px-5 py-4 text-gray-900 dark:text-white max-w-[200px] font-medium overflow-hidden whitespace-nowrap text-ellipsis" title={ticket.requester_name}>
                          {ticket.requester_name}
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-300 max-w-[280px] overflow-hidden whitespace-nowrap text-ellipsis" title={ticket.requester_email || '-'}>
                          {ticket.requester_email || '-'}
                        </td>
                        <td className="px-5 py-4 text-gray-800 dark:text-white max-w-[400px] overflow-hidden whitespace-nowrap text-ellipsis" title={ticket.subject}>
                          {ticket.subject}
                        </td>
                        <td className="px-5 py-4 text-sm whitespace-nowrap">
                          <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${priorityColors[ticket.priority] || priorityColors.low}`}>
                            {(ticket.priority || 'low').charAt(0).toUpperCase() + (ticket.priority || 'low').slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm whitespace-nowrap">
                          <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${statusColors[ticket.status] || statusColors.open}`}>
                            {ticket.status === 'open' ? 'New' : ticket.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-800 dark:text-white text-sm whitespace-nowrap">
                          {new Date(ticket.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit"
                          })}
                        </td>
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                if (onTicketIdClick) {
                                  onTicketIdClick(ticket);
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors flex items-center gap-1"
                              title="Open chat"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Chat
                            </motion.button>
                          </div>
                        </td>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
        </div>
      )}
      </Card>

      {/* Pagination */}
      {totalItems > itemsPerPage && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} tickets
          </p>
            <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Previous
            </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)}
              </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * itemsPerPage >= totalItems}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Next
            </button>
          </div>
        </div>
        </Card>
      )}
    </div>
  );
}

