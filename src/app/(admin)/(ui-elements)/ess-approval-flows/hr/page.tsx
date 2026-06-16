"use client";

import { useAuth } from '@/hooks/useAuth';
import HRApprovalsComponent from '@/components/ess-portal/approval-flows/HRApprovalsComponent';

function HRApprovalsPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <HRApprovalsComponent />
  );
}

export default HRApprovalsPage;