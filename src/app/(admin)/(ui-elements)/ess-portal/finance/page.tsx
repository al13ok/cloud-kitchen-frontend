"use client";

import React, { Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import FinanceApprovals from '@/components/ess-portal/approval-flows/finance/FinanceApprovals';

export default function FinanceListPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
        <div className="h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <FinanceApprovals />
      </Suspense>
    </div>
  );
}
