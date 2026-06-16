"use client";

import { useAuth } from '@/hooks/useAuth';
import ApplyLeaveForm from '@/components/ess-portal/leave/ApplyLeaveForm';

export default function ApplyLeavePage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-white to-sky-50/30 relative overflow-hidden">
      {/* Ultra-Modern Premium Background Elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-100/15 to-blue-100/15 rounded-full -translate-y-40 translate-x-40 animate-float-slow"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-sky-100/15 to-indigo-100/15 rounded-full translate-y-32 -translate-x-32 animate-float-reverse"></div>
      <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-r from-blue-100/10 to-sky-100/10 rounded-full animate-float delay-500"></div>
      
      <ApplyLeaveForm />
    </div>
  );
}