"use client";
import { useEffect, useState } from 'react';
import { useInactivity } from '@/hooks/useInactivity';
import { useAuth } from '@/hooks/useAuth';
import InactivityWarningModal from '@/components/InactivityWarningModal';
import AuthService from '@/services/AuthService';

export default function InactivityTracker() {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  // Initialize the inactivity tracking hook
  useInactivity();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    
    // Handle session timeout events
    const handleSessionTimeout = async (event: Event) => {
      const customEvent = event as CustomEvent;
      
      const authService = AuthService.getInstance();
      
      // Show user-friendly message based on timeout reason
      if (customEvent.detail?.reason === 'inactivity') {
        // Session expired due to 30 minutes of inactivity
      } else if (customEvent.detail?.reason === 'backend_timeout') {
        // Session expired by backend security policy
      }
      
      // Force logout if not already logged out
      if (authService.isAuthenticated()) {
        await authService.logout();
      }
    };
    
    // Handle session expired events from backend
    const handleSessionExpired = async () => {
      const authService = AuthService.getInstance();
      
      // Force logout if not already logged out
      if (authService.isAuthenticated()) {
        await authService.logout();
      }
    };
    
    // Add event listeners for session events
    window.addEventListener('sessionTimeout', handleSessionTimeout);
    window.addEventListener('sessionExpired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('sessionTimeout', handleSessionTimeout);
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, [mounted]);
  
  // Only show warning modal if user is authenticated and component is mounted
  if (!mounted || !isAuthenticated) {
    return null;
  }
  
  return (
    <>
      <InactivityWarningModal />
    </>
  );
} 