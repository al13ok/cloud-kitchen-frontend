"use client";

import React from 'react';
import SessionManagement from '@/components/SessionManagement';
import ComponentCard from '@/components/common/ComponentCard';

const SessionManagementPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Session Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your active sessions across all devices with WhatsApp-like multi-session support.
        </p>
      </div>
      
      <ComponentCard title="Multi-Device Session Management">
        <SessionManagement />
      </ComponentCard>
    </div>
  );
};

export default SessionManagementPage;
