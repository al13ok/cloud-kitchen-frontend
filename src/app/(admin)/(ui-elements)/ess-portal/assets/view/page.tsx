"use client";

import AssetViewPage from '@/components/ess-portal/assets/AssetViewPage';
import { useAuth } from '@/hooks/useAuth';
import { Suspense } from 'react';

export default function AssetView() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12">Loading...</div>}>
      <AssetViewPage />
    </Suspense>
  );
}