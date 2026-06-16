"use client";

import { useAuth } from '@/hooks/useAuth';
import ExpenseManagementComponent from '@/components/ess-portal/expenses/ExpenseManagementComponent';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/header/DashboardHeader';
import { DollarSign, RefreshCw } from 'lucide-react';

export default function ExpensesPage() {
  const { isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden dark:bg-black" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <DashboardHeader
          title="Expense Management"
          subtitle="Comprehensive expense management system with claim submission, approval workflows, receipt tracking, and detailed reporting for efficient financial management."
          icon={DollarSign}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Portal', href: '/ess-portal' },
            { label: 'Expense' }
          ]}
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/ess-portal/expenses/submit')}
                className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
                title="Submit Expense"
              >
                <DollarSign className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Submit Expense</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Refresh</span>
              </button>
            </div>
          }
        />
        <ExpenseManagementComponent />
      </div>
    </div>
  );
}


