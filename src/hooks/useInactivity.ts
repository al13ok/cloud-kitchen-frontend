import { useEffect, useCallback } from 'react';
import InactivityService from '@/services/InactivityService';
import { useAuth } from './useAuth';

export function useInactivity() {
  const { isAuthenticated } = useAuth();

  const startInactivityTracking = useCallback(() => {
    const inactivityService = InactivityService.getInstance();
    inactivityService.start();
  }, []);

  const stopInactivityTracking = useCallback(() => {
    const inactivityService = InactivityService.getInstance();
    inactivityService.stop();
  }, []);

  const resetInactivityTimer = useCallback(() => {
    const inactivityService = InactivityService.getInstance();
    inactivityService.reset();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Start inactivity tracking when user is authenticated
      startInactivityTracking();
    } else {
      // Stop inactivity tracking when user is not authenticated
      stopInactivityTracking();
    }

    // Cleanup on unmount
    return () => {
      stopInactivityTracking();
    };
  }, [isAuthenticated, startInactivityTracking, stopInactivityTracking]);

  return {
    startInactivityTracking,
    stopInactivityTracking,
    resetInactivityTimer,
  };
} 