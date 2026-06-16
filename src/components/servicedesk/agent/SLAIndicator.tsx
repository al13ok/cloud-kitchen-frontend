'use client';

import React from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SLAStatus {
  status: 'pending' | 'on_time' | 'at_risk' | 'breached';
  resolution_due?: string;
  first_response_due?: string;
}

interface SLAIndicatorProps {
  slaStatus: SLAStatus;
}

export default function SLAIndicator({ slaStatus }: SLAIndicatorProps) {
  const getSLAInfo = () => {
    switch (slaStatus.status) {
      case 'on_time':
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          icon: CheckCircle,
          label: 'On Time',
        };
      case 'at_risk':
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          icon: AlertTriangle,
          label: 'At Risk',
        };
      case 'breached':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          icon: XCircle,
          label: 'Breached',
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          icon: Clock,
          label: 'Pending',
        };
    }
  };

  const getTimeRemaining = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      return 'Overdue';
    }
    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days}d ${diffHours % 24}h left`;
    }
    return `${diffHours}h ${diffMins}m left`;
  };

  const slaInfo = getSLAInfo();
  const Icon = slaInfo.icon;
  const timeRemaining = getTimeRemaining(slaStatus.resolution_due || slaStatus.first_response_due);

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md ${slaInfo.bgColor}`}>
      <Icon className={`w-4 h-4 ${slaInfo.color}`} />
      <span className={`text-xs font-medium ${slaInfo.color}`}>
        {slaInfo.label}
      </span>
      {timeRemaining && (
        <span className={`text-xs ${slaInfo.color} ml-1`}>
          • {timeRemaining}
        </span>
      )}
    </div>
  );
}

