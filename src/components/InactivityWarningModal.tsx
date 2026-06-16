"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, LogOut, RotateCcw, AlertTriangle } from 'lucide-react';
import InactivityService, { type InactivityWarning } from '@/services/InactivityService';

interface InactivityWarningModalProps {
  className?: string;
}

const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({ className = '' }) => {
  const [warning, setWarning] = useState<InactivityWarning | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);

  const stopCountdown = useCallback(() => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
  }, [countdownInterval]);

  const startCountdown = useCallback(() => {
    stopCountdown(); // Clear any existing interval
    
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdownInterval(interval);
  }, [stopCountdown]);

  useEffect(() => {
    const inactivityService = InactivityService.getInstance();
    
    // Subscribe to inactivity warnings
    const unsubscribe = inactivityService.onWarning((warningData) => {
      setWarning(warningData);
      
      if (warningData.show) {
        // Start countdown
        setCountdown(warningData.timeLeft);
        startCountdown();
      } else {
        // Hide warning and stop countdown
        stopCountdown();
        setCountdown(0);
      }
    });

    return () => {
      unsubscribe();
      stopCountdown();
    };
  }, [startCountdown, stopCountdown]);

  const handleExtendSession = () => {
    if (warning?.onExtend) {
      warning.onExtend();
    }
    stopCountdown();
  };

  const handleLogout = () => {
    if (warning?.onLogout) {
      warning.onLogout();
    }
    stopCountdown();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!warning?.show) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 modal-backdrop z-[9999]" />
      
      {/* Modal */}
      <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border-2 border-orange-200 dark:border-orange-600 animate-fade-in-scale animate-warning-glow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 warning-icon-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Session Expiring Soon
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your session will expire due to inactivity
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-full mb-4">
                <Clock className="w-10 h-10 text-orange-600 dark:text-orange-400" />
              </div>
              
              <div className={`text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2 ${
                countdown <= 60 ? 'countdown-urgent' : ''
              }`}>
                {formatTime(countdown)}
              </div>
              
              <p className="text-gray-700 dark:text-gray-300">
                Your session will automatically log out in the time shown above due to inactivity.
              </p>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Click &quot;Stay Logged In&quot; to extend your session.
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-orange-600 dark:bg-orange-400 h-2 rounded-full session-progress"
                  style={{ 
                    width: `${Math.max(0, (countdown / (warning.timeLeft || 1)) * 100)}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Session Expiring</span>
                <span>{Math.round((countdown / (warning.timeLeft || 1)) * 100)}%</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExtendSession}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                Stay Logged In
              </button>
              
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 hover:scale-105 active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Logout Now
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
            <p className="text-xs text-center text-gray-600 dark:text-gray-400">
              🔒 For your security, we automatically log out inactive sessions after 30 minutes
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default InactivityWarningModal;