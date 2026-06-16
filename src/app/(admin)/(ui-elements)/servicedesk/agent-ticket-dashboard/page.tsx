'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { 
  Ticket, 
  BarChart3, 
  Bell, 
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MyTicketsTab, { TicketStatsSummary, TicketSyncMeta } from '@/components/servicedesk/agent/MyTicketsTab';
import AnalyticsTab from '@/components/servicedesk/agent/AnalyticsTab';
import NotificationsTab from '@/components/servicedesk/agent/NotificationsTab';
import DashboardHeader from '@/components/header/DashboardHeader';

type TabType = 'tickets' | 'analytics' | 'notifications';

export default function AgentTicketDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [ticketStats, setTicketStats] = useState<TicketStatsSummary>({
    total: 0,
    open: 0,
    in_progress: 0,
    pending: 0,
    resolved: 0,
  });
  const [, setSyncMeta] = useState<TicketSyncMeta | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);

  const agentHeroCards = [
    {
      label: 'Assigned',
      value: ticketStats.total,
      hint: 'Tickets currently owned by you',
      gradient: 'from-blue-500 to-blue-600',
      icon: Ticket,
    },
    {
      label: 'Open',
      value: ticketStats.open,
      hint: 'Awaiting your first touch',
      gradient: 'from-blue-500 to-blue-600',
      icon: RefreshCw,
    },
    {
      label: 'In Progress',
      value: ticketStats.in_progress,
      hint: 'Actively being worked on',
      gradient: 'from-blue-500 to-blue-600',
      icon: BarChart3,
    },
    {
      label: 'Pending',
      value: ticketStats.pending,
      hint: 'Waiting on customer input',
      gradient: 'from-blue-500 to-blue-600',
      icon: Bell,
    },
    {
      label: 'Resolved',
      value: ticketStats.resolved,
      hint: 'Closed in current cycle',
      gradient: 'from-blue-500 to-blue-600',
      icon: Sparkles,
    },
  ];

  const tabs = [
    { id: 'tickets' as TabType, label: 'My Tickets', icon: Ticket },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
  ];

  const handleStatsChange = useCallback((stats: TicketStatsSummary) => {
    setTicketStats(stats);
  }, []);

  const handleSyncMetaChange = useCallback((meta: TicketSyncMeta) => {
    setSyncMeta(meta);
    setIsForceRefreshing(false);
  }, []);

  const handleGlobalRefresh = () => {
    setIsForceRefreshing(true);
    setRefreshSignal(prev => prev + 1);
  };

  const resolvedUserId = isHydrated
    ? (
        user?.user_id ||
        (user as unknown as Record<string, string | undefined>)?.id ||
        (user as unknown as Record<string, string | undefined>)?._id ||
        (user as unknown as Record<string, string | undefined>)?.userId
      )
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-100/30 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 gap-8">
        <section className="w-full max-w-6xl">
          <DashboardHeader
            title="Agent Desk"
            subtitle="Stay on top of every customer conversation with a modern workspace that mirrors the rest of the service desk experience."
            icon={Ticket}
            iconColor="text-white"
            variant="default"
            size="lg"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Service Desk', href: '/servicedesk/servicedesk-dashboard' },
              { label: 'Agent Desk' }
            ]}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleGlobalRefresh}
                  disabled={isForceRefreshing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/30 shadow-lg hover:bg-white/30 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isForceRefreshing ? 'animate-spin' : ''}`} />
                  {isForceRefreshing ? 'Syncing...' : 'Refresh Tickets'}
                </button>
                <Link
                  href="/servicedesk/servicedesk-dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold border border-white/30 text-white bg-white/10 backdrop-blur-sm shadow-md hover:bg-white/20 hover:shadow-lg transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  View SLA Insights
                </Link>
              </div>
            }
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {agentHeroCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`relative overflow-hidden rounded-2xl border border-white/40 dark:border-white/10 bg-gradient-to-br ${card.gradient} text-white px-4 py-4 shadow-xl`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="p-2 rounded-2xl bg-white/15">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-white/75">{card.label}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/80 mt-3">{card.hint}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="w-full max-w-6xl flex-1 pb-20">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-white/70 dark:border-white/10 rounded-3xl shadow-2xl p-5 sm:p-7">
            <div className="flex flex-wrap gap-3 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const showBadge = tab.id === 'notifications' && unreadNotifications > 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all text-sm font-semibold ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border-transparent'
                        : 'bg-white dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 border-gray-200/60 dark:border-gray-700/70 hover:border-blue-400/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {showBadge && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-white/20 rounded-full">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'tickets' && (
                <motion.div
                  key="tickets"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <MyTicketsTab
                    currentUserId={resolvedUserId}
                    currentUserEmail={isHydrated ? user?.email : undefined}
                    onStatsChange={handleStatsChange}
                    onSyncMetaChange={handleSyncMetaChange}
                    refreshSignal={refreshSignal}
                  />
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnalyticsTab
                    currentUserId={resolvedUserId}
                    currentUserEmail={isHydrated ? user?.email : undefined}
                  />
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <NotificationsTab
                    onUnreadCountChange={setUnreadNotifications}
                    currentUserId={resolvedUserId}
                    currentUserEmail={isHydrated ? user?.email : undefined}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

    </div>
  );
}

