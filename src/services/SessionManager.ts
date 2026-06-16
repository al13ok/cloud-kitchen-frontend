/**
 * SessionManager - WhatsApp-like Multi-Session Management Service
 * 
 * This service provides comprehensive session management capabilities including:
 * - Multi-device session tracking
 * - Real-time presence monitoring
 * - Session revocation and logout management
 * - Activity tracking and auto-logout
 * - Device type management
 */

import { RBAC_CONFIG } from '@/utils/config';

export interface SessionInfo {
  session_id: string;
  device_type: string;
  device_name?: string;
  status: string;
  login_time?: string;
  logout_time?: string;
  ip_address?: string;
  user_agent?: string;
  last_active?: string;
  is_expired?: boolean;
  is_active?: boolean;
}

export interface UserPresence {
  status: 'online' | 'away' | 'offline';
  lastLogin?: string;
  lastLogout?: string;
  userId?: string;
  email?: string;
  fullName?: string;
}

export interface RecentActivity {
  userId: string;
  email: string;
  fullName: string;
  presence: 'online' | 'away' | 'offline';
  lastLogin?: string;
  lastLogout?: string;
}

export interface SessionResponse {
  message: string;
  session_id?: string;
  logged_out_count?: number;
  user_id?: string;
  cache_cleared?: boolean;
  user_status_updated?: boolean;
  cookie_validation?: Record<string, unknown>;
  logout_time?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  csrf_token: string;
  session_id: string;
  expires_at: string;
}

class SessionManager {
  private static instance: SessionManager;
  private listeners: ((sessions: SessionInfo[]) => void)[] = [];
  private presenceListeners: ((presence: UserPresence) => void)[] = [];
  private activityTrackingInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly ACTIVITY_INTERVAL = 120000; // 2 minutes (reduced from 30 seconds)
  private readonly HEARTBEAT_INTERVAL = 60000; // 1 minute
  private readonly SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour (changed from 30 minutes)
  private activityEndpointAvailable = true; // Flag to track if activity endpoint works

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Get authentication headers with CSRF token
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (typeof window !== 'undefined') {
      // Get access token from localStorage or cookie
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Get CSRF token from localStorage or cookie
      const csrfToken = 
        localStorage.getItem('XSRF-TOKEN') ||
        this.getCookieValue('XSRF-TOKEN');
      
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return headers;
  }

  /**
   * Helper function to get cookie value
   */
  private getCookieValue(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  /**
   * Get current user ID from localStorage or cookies
   */
  private getCurrentUserId(): string | null {
    if (typeof window === 'undefined') return null;

    // Try to get from localStorage first
    const userId = localStorage.getItem('user_id') || localStorage.getItem('userData');
    if (userId) {
      try {
        // If userData is a JSON string, parse it
        const userData = JSON.parse(userId);
        return userData.user_id || userData.id || null;
      } catch {
        // If it's not JSON, return as is
        return userId;
      }
    }

    // Fallback to cookie
    return this.getCookieValue('user_id');
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(): Promise<RefreshTokenResponse> {
    const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.REFRESH}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      // credentials: 'include', // Removed to fix CORS issues
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Token refresh failed' }));
      throw new Error(errorData.message || 'Failed to refresh token');
    }

    const data = await response.json();
    
    // Update stored access token
    if (typeof window !== 'undefined' && data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      if (data.csrf_token) {
        localStorage.setItem('XSRF-TOKEN', data.csrf_token);
      }
    }

    return data;
  }

  /**
   * Get all active sessions for the current user
   */
  public async getSessions(): Promise<SessionInfo[]> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/sessions`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        // credentials: 'include', // Removed to fix CORS issues
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token
          try {
            await this.refreshToken();
            // Retry the request
            const retryResponse = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/sessions`, {
              method: 'GET',
              headers: this.getAuthHeaders(),
              // credentials: 'include', // Removed to fix CORS issues
            });
            if (retryResponse.ok) {
              const sessions = await retryResponse.json();
              this.notifySessionListeners(sessions);
              return sessions;
            }
          } catch {
            // Token refresh failed
          }
        }
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }

      const sessions = await response.json();
      this.notifySessionListeners(sessions);
      return sessions;
    } catch (error) {
      // Error fetching sessions
      throw error;
    }
  }

  /**
   * Logout from current session only
   */
  public async logoutCurrentSession(): Promise<SessionResponse> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.LOGOUT}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        // credentials: 'include', // Removed to fix CORS issues
      });

      const data = await response.json();
      
      if (response.ok) {
        // Clear local authentication data
        this.clearLocalAuthData();
        
        // Notify listeners about session changes
        this.notifySessionListeners([]);
        
        // Dispatch logout event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sessionLogout', {
            detail: { type: 'current', data }
          }));
        }
      }

      return data;
    } catch (error) {
      // Error logging out current session
      throw error;
    }
  }

  /**
   * Logout from all sessions (all devices)
   */
  public async logoutAllSessions(): Promise<SessionResponse> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.LOGOUT_ALL}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        // credentials: 'include', // Removed to fix CORS issues
      });

      const data = await response.json();
      
      if (response.ok) {
        // Clear local authentication data
        this.clearLocalAuthData();
        
        // Notify listeners about session changes
        this.notifySessionListeners([]);
        
        // Dispatch logout event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sessionLogout', {
            detail: { type: 'all', data }
          }));
        }
      }

      return data;
    } catch (error) {
      // Error logging out all sessions
      throw error;
    }
  }

  /**
   * Revoke a specific session by session_id
   */
  public async revokeSession(sessionId: string): Promise<SessionResponse> {
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);

      const headers = this.getAuthHeaders();
      // Remove Content-Type to let browser set it for FormData
      delete (headers as Record<string, unknown>)['Content-Type'];

      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/sessions/revoke`, {
        method: 'POST',
        headers,
        body: formData,
        // credentials: 'include', // Removed to fix CORS issues
      });

      const data = await response.json();
      
      if (response.ok) {
        // Refresh sessions list
        await this.getSessions();
      }

      return data;
    } catch (error) {
      // Error revoking session
      throw error;
    }
  }

  /**
   * Get current user's presence and activity
   */
  public async getMyActivity(): Promise<UserPresence> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/me/activity`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        // credentials: 'include', // Removed to fix CORS issues
      });

      if (!response.ok) {
        // If endpoint doesn't exist (404), mark as unavailable and return default presence
        if (response.status === 404) {
          this.activityEndpointAvailable = false;
          const defaultPresence: UserPresence = {
            status: 'online',
            userId: this.getCurrentUserId() || 'unknown',
            lastLogin: new Date().toISOString()
          };
          this.notifyPresenceListeners(defaultPresence);
          return defaultPresence;
        }
        throw new Error(`Failed to fetch activity: ${response.status}`);
      }

      // Mark endpoint as available if we get here
      this.activityEndpointAvailable = true;
      const activity = await response.json();
      this.notifyPresenceListeners(activity);
      return activity;
    } catch (error) {
      // Error fetching user activity
      
      // If it's a network error or endpoint not found, mark as unavailable and return default presence
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        this.activityEndpointAvailable = false;
        const defaultPresence: UserPresence = {
          status: 'online',
          userId: this.getCurrentUserId() || 'unknown',
          lastLogin: new Date().toISOString()
        };
        this.notifyPresenceListeners(defaultPresence);
        return defaultPresence;
      }
      
      throw error;
    }
  }

  /**
   * Get recent activity for all users (admin function)
   */
  public async getRecentActivity(limit: number = 50): Promise<RecentActivity[]> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/recent-activity?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        // credentials: 'include', // Removed to fix CORS issues
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recent activity: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Error fetching recent activity
      throw error;
    }
  }

  /**
   * Get current session status and information
   */
  public async getSessionStatus(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/session-status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        // credentials: 'include', // Removed to fix CORS issues
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch session status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Error fetching session status
      throw error;
    }
  }

  /**
   * Clear user cache manually
   */
  public async clearUserCache(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.CLEAR_CACHE}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        // credentials: 'include', // Removed to fix CORS issues
      });

      if (!response.ok) {
        throw new Error(`Failed to clear cache: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Error clearing cache
      throw error;
    }
  }

  /**
   * Get cookie status for debugging
   */
  public async getCookieStatus(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.COOKIE_STATUS}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        // credentials: 'include', // Removed to fix CORS issues
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cookie status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Error fetching cookie status
      throw error;
    }
  }

  /**
   * Clear local authentication data
   */
  private clearLocalAuthData(): void {
    if (typeof window === 'undefined') return;

    // Clear localStorage
    const keysToRemove = [
      'access_token', 'userData', 'loginResponse', 'userEmail', 'user_id',
      'role_id', 'login_flag', 'full_name', 'isAuthenticated', 'jwtToken',
      'userType', 'XSRF-TOKEN', 'userName', 'user_email', 'user_roles'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear sessionStorage
    sessionStorage.removeItem('isLoggingOut');

    // Clear cookies
    const cookieNames = [
      'token', 'refresh_token', 'XSRF-TOKEN', 'isAuthenticated',
      'user_id', 'user_email', 'user_roles', 'role_id', 'access_token'
    ];

    cookieNames.forEach(name => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/api; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
  }

  /**
   * Start activity tracking
   */
  public startActivityTracking(): void {
    if (this.activityTrackingInterval) {
      clearInterval(this.activityTrackingInterval);
    }

    this.activityTrackingInterval = setInterval(() => {
      // Only try to fetch activity if the endpoint is available
      if (this.activityEndpointAvailable) {
        // Activity is automatically tracked by the backend on each API call
        // We can optionally fetch updated presence here
        this.getMyActivity().catch(() => {
          // Silently handle errors in background activity tracking
          // The getMyActivity method will handle marking endpoint as unavailable
        });
      }
    }, this.ACTIVITY_INTERVAL);

    // Also start heartbeat to keep session alive
    this.startHeartbeat();
  }

  /**
   * Stop activity tracking
   */
  public stopActivityTracking(): void {
    if (this.activityTrackingInterval) {
      clearInterval(this.activityTrackingInterval);
      this.activityTrackingInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start heartbeat to keep session alive and check for session timeout
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        // Make a lightweight request to keep session active
        const sessionStatus = await this.getSessionStatus();
        
        // Check if backend detected session timeout
        if (sessionStatus && sessionStatus.expired) {
          // Backend detected session timeout
          // Dispatch session expired event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sessionExpired', {
              detail: { 
                reason: 'backend_timeout',
                sessionStatus 
              }
            }));
          }
        }
      } catch (error) {
        // If heartbeat fails, the session might be expired
        
        // Check if it's a 401 (unauthorized) - session expired
        if (error instanceof Error && error.message.includes('401')) {
          // Session expired (401 Unauthorized)
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sessionExpired', {
              detail: { 
                reason: 'unauthorized',
                error: error.message
              }
            }));
          }
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Subscribe to session changes
   */
  public subscribeToSessions(listener: (sessions: SessionInfo[]) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately fetch and notify with current sessions
    this.getSessions().catch(() => {
      // Handle error silently for initial fetch
    });

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Subscribe to presence changes
   */
  public subscribeToPresence(listener: (presence: UserPresence) => void): () => void {
    this.presenceListeners.push(listener);
    
    // Immediately fetch and notify with current presence
    this.getMyActivity().catch(() => {
      // Handle error silently for initial fetch
    });

    return () => {
      this.presenceListeners = this.presenceListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify session listeners
   */
  private notifySessionListeners(sessions: SessionInfo[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(sessions);
      } catch {
        // Error in session listener
      }
    });
  }

  /**
   * Notify presence listeners
   */
  private notifyPresenceListeners(presence: UserPresence): void {
    this.presenceListeners.forEach(listener => {
      try {
        listener(presence);
      } catch {
        // Error in presence listener
      }
    });
  }

  /**
   * Notify backend about user activity to extend session
   */
  public async recordActivity(): Promise<void> {
    try {
      // This is automatically handled by making any authenticated request
      // Backend updates last_activity timestamp on each API call
      await this.getSessionStatus();
    } catch {
      // Failed to record activity
      // Don't throw error as this is background activity tracking
    }
  }

  /**
   * Check if current session is close to expiring (within warning period)
   */
  public async checkSessionExpiry(): Promise<{ isExpiring: boolean; timeLeft: number }> {
    try {
      const sessionStatus = await this.getSessionStatus();
      
      if (sessionStatus && sessionStatus.last_activity && typeof sessionStatus.last_activity === 'string') {
        const lastActivity = new Date(sessionStatus.last_activity);
        const now = new Date();
        const timeSinceActivity = now.getTime() - lastActivity.getTime();
        const timeLeft = this.SESSION_TIMEOUT_MS - timeSinceActivity;
        
        const warningThreshold = 5 * 60 * 1000; // 5 minutes
        const isExpiring = timeLeft <= warningThreshold && timeLeft > 0;
        
        return {
          isExpiring,
          timeLeft: Math.max(0, Math.floor(timeLeft / 1000)) // Return seconds
        };
      }
      
      return { isExpiring: false, timeLeft: 0 };
    } catch {
      // Failed to check session expiry
      return { isExpiring: false, timeLeft: 0 };
    }
  }

  /**
   * Cleanup when service is destroyed
   */
  public destroy(): void {
    this.stopActivityTracking();
    this.listeners = [];
    this.presenceListeners = [];
  }
}

export default SessionManager;