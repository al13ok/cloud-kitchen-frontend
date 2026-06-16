"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import ITApprovalsComponent from '@/components/ess-portal/approval-flows/ITApprovalsComponent';

const ITApprovalsPage = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#3366CC', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  return <ITApprovalsComponent />;
};

export default ITApprovalsPage;