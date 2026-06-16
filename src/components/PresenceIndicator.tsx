"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthService from '@/services/AuthService';
import Badge from '@/components/ui/badge/Badge';
import { 
  Clock,
  User,
  Wifi,
  WifiOff
} from 'lucide-react';

interface UserPresence {
  status: 'online' | 'away' | 'offline';
  lastLogin?: string;
  lastLogout?: string;
  userId?: string;
  email?: string;
  fullName?: string;
}

interface PresenceIndicatorProps {
  userId?: string;
  showLabel?: boolean;
  showLastSeen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface ActivityTrackerProps {
  children: React.ReactNode;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  userId,
  showLabel = true,
  showLastSeen = false,
  size = 'md',
  className = ''
}) => {
  const { user, isAuthenticated } = useAuth();
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState(true);

  const authService = AuthService.getInstance();
  const sessionManager = authService.getSessionManager();
  const targetUserId = userId || user?.user_id;

  // Size configurations
  const sizeConfig = {
    sm: {
      dot: 'w-2 h-2',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      dot: 'w-3 h-3',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      dot: 'w-4 h-4',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  // Get presence color and icon
  const getPresenceStyles = (status: string) => {
    switch (status) {
      case 'online':
        return {
          color: 'bg-green-500',
          badgeColor: 'success' as const,
          icon: <Wifi className={sizeConfig[size].icon} />,
          label: 'Online'
        };
      case 'away':
        return {
          color: 'bg-yellow-500',
          badgeColor: 'warning' as const,
          icon: <Clock className={sizeConfig[size].icon} />,
          label: 'Away'
        };
      case 'offline':
        return {
          color: 'bg-gray-500',
          badgeColor: 'light' as const,
          icon: <WifiOff className={sizeConfig[size].icon} />,
          label: 'Offline'
        };
      default:
        return {
          color: 'bg-gray-400',
          badgeColor: 'light' as const,
          icon: <User className={sizeConfig[size].icon} />,
          label: 'Unknown'
        };
    }
  };

  // Format last seen time
  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  // Load presence data
  const loadPresence = useCallback(async () => {
    if (!isAuthenticated || !targetUserId) return;
    
    try {
      setLoading(true);
      
      // If it's the current user, use getMyActivity
      if (targetUserId === user?.user_id) {
        try {
          const presenceData = await sessionManager.getMyActivity();
          setPresence(presenceData);
        } catch (error) {
          // If getMyActivity fails, set a default online presence
          console.warn('Activity endpoint not available, using default presence:', error);
          setPresence({
            status: 'online',
            userId: targetUserId,
            lastLogin: new Date().toISOString()
          });
        }
      } else {
        // For other users, we would need an API endpoint to get their presence
        // For now, set a default offline state
        setPresence({
          status: 'offline',
          userId: targetUserId
        });
      }
    } catch (error) {
      console.warn('Error loading presence, using default:', error);
      setPresence({
        status: 'offline',
        userId: targetUserId
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, targetUserId, user?.user_id, sessionManager]);

  // Subscribe to presence updates
  useEffect(() => {
    if (!isAuthenticated || !targetUserId) return;

    // Only subscribe to presence updates for current user
    if (targetUserId === user?.user_id) {
      const unsubscribe = authService.subscribeToPresence((presence: unknown) => {
        setPresence(presence as UserPresence | null);
      });
      loadPresence();
      return unsubscribe;
    } else {
      loadPresence();
    }
  }, [isAuthenticated, targetUserId, user?.user_id, authService, loadPresence]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeConfig[size].dot} rounded-full bg-gray-300 animate-pulse`} />
        {showLabel && (
          <span className={`${sizeConfig[size].text} text-gray-500`}>Loading...</span>
        )}
      </div>
    );
  }

  if (!presence) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeConfig[size].dot} rounded-full bg-gray-400`} />
        {showLabel && (
          <span className={`${sizeConfig[size].text} text-gray-500`}>Unknown</span>
        )}
      </div>
    );
  }

  const styles = getPresenceStyles(presence.status);
  const lastSeenTime = presence.status === 'offline' ? 
    (presence.lastLogout || presence.lastLogin) : 
    presence.lastLogin;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className={`${sizeConfig[size].dot} rounded-full ${styles.color} ring-2 ring-white dark:ring-gray-800`} />
        {size === 'lg' && (
          <div className="absolute -bottom-1 -right-1">
            {styles.icon}
          </div>
        )}
      </div>
      
      {showLabel && (
        <div className="flex flex-col">
          <Badge color={styles.badgeColor} size={size === 'sm' ? 'sm' : 'md'}>
            {styles.label}
          </Badge>
          {showLastSeen && lastSeenTime && presence.status === 'offline' && (
            <span className={`${sizeConfig[size].text} text-gray-500 mt-1`}>
              Last seen {formatLastSeen(lastSeenTime)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Activity Tracker Component - automatically tracks user activity
const ActivityTracker: React.FC<ActivityTrackerProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [lastActivity, setLastActivity] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  const authService = AuthService.getInstance();
  const sessionManager = authService.getSessionManager();

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track user activity
  const handleActivity = () => {
    setLastActivity(new Date());
  };

  // Set up activity listeners
  useEffect(() => {
    if (!isAuthenticated || !mounted) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Set up activity timeout
    const activityTimeout = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      
      // Check activity after 5 minutes of no activity
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        // Could trigger some inactive state here if needed
      }
    }, 30000); // Check every 30 seconds

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(activityTimeout);
    };
  }, [isAuthenticated, lastActivity, mounted]);

  // Start session activity tracking
  useEffect(() => {
    if (isAuthenticated && mounted) {
      sessionManager.startActivityTracking();
      return () => {
        sessionManager.stopActivityTracking();
      };
    }
  }, [isAuthenticated, mounted, sessionManager]);

  return (
    <>
      {children}
    </>
  );
};

// Hook for getting user presence
export const usePresence = (userId?: string) => {
  const { user, isAuthenticated } = useAuth();
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState(true);

  const authService = AuthService.getInstance();
  const targetUserId = userId || user?.user_id;

  useEffect(() => {
    if (!isAuthenticated || !targetUserId) {
      setLoading(false);
      return;
    }

    // Only subscribe to presence updates for current user
    if (targetUserId === user?.user_id) {
      const unsubscribe = authService.subscribeToPresence((newPresence: unknown) => {
        setPresence(newPresence as UserPresence | null);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // For other users, set offline by default
      setPresence({
        status: 'offline',
        userId: targetUserId
      });
      setLoading(false);
    }
  }, [isAuthenticated, targetUserId, user?.user_id, authService]);

  return { presence, loading };
};

export { ActivityTracker };
export default PresenceIndicator;