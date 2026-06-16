"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import LeaveManagementComponent from '@/components/ess-portal/leave/LeaveManagementComponent';

export default function LeaveManagementPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <LeaveManagementComponent />
  );
}