"use client";

import { Suspense } from 'react';
import PageHeader from '@/components/common/PageHeader';
import FinanceViewPage from '@/components/ess-portal/approval-flows/FinanceViewPage';
import { DollarLineIcon } from '@/icons';
import { useAuth } from '@/hooks/useAuth';

export default function ViewFinancePage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Finance Application Details"
          description="View finance application and employee details"
          icon={<DollarLineIcon className="w-6 h-6 text-white" />}
          iconBgColor="bg-green-500"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'ESS Portal', href: '/ess-portal' }, { label: 'Finance', href: '/ess-portal/finance' }, { label: 'View' }]}
          tips={[
            'Review the application amount and category',
            'See employee contact information',
            'Approve or reject if necessary'
          ]}
        />
        <Suspense fallback={<div>Loading...</div>}>
          <FinanceViewPage />
        </Suspense>
      </div>
    </div>
  );
}
