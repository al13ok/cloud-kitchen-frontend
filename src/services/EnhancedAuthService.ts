/**
 * Enhanced Authentication Service
 * Integrates with the new backend RBAC system for comprehensive authentication and authorization
 */

import { getAuthHeaders } from '../utils/api';
import { RBAC_CONFIG } from '../utils/config';
import DynamicNavigationService from './DynamicNavigationService';
import RouteProtectionService from './RouteProtectionService';

export interface User {
  user_id: string;
  id?: string;
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
  session_id?: string;
  last_login?: string;
  status?: boolean;
  login_flag?: string;
  [key: string]: unknown;
}

export interface UserRouteInfo {
  user_id: string;
  email: string;
  full_name: string;
  roles: string[];
  routes: Array<{
    route: string;
    path: string;
    access: boolean;
    permissions: string[];
  }>;
}

export interface RouteAccessResponse {
  access: boolean;
  message: string;
  permissions: string[];
  user_roles: string[];
  route: string;
  status: string;
}

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

export interface LoginCredentials {
  identifier: string;
  password: string;
  device_type?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  access_token: string;
  refresh_token: string;
  session_id: string;
  expires_in: number;
  redirect_path?: string;
}

class EnhancedAuthService {
  private static instance: EnhancedAuthService;
  private user: User | null = null;
  private userRoutes: UserRouteInfo | null = null;
  private sessions: SessionInfo[] = [];
  private isLoading = false;
  private listeners: Array<(isAuthenticated: boolean, user: User | null) => void> = [];

  private constructor() {}

  public static getInstance(): EnhancedAuthService {
    if (!EnhancedAuthService.instance) {
      EnhancedAuthService.instance = new EnhancedAuthService();
    }
    return EnhancedAuthService.instance;
  }

  /**
   * Login with enhanced RBAC integration
   */
  public async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      this.isLoading = true;
      
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Login failed: ${response.status}`);
      }

      const data: LoginResponse = await response.json();
      
      if (data.success) {
        // Store tokens
        this.storeTokens(data.access_token, data.refresh_token);
        
        // Set user data
        this.user = data.user;
        
        // Fetch user routes and permissions
        await this.loadUserRoutes();
        
        // Load user sessions
        await this.loadUserSessions();
        
        // Notify listeners
        this.notifyListeners(true, this.user);
        
        return data;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Logout with session cleanup
   */
  public async logout(): Promise<void> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.LOGOUT}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      // Clear local data regardless of response
      this.clearAuthData();
      
      // Clear route protection caches
      RouteProtectionService.getInstance().clearAllCaches();
      
      if (response.ok) {
        console.log('Logout successful');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if logout request fails
      this.clearAuthData();
      // Still clear route caches even on error
      RouteProtectionService.getInstance().clearAllCaches();
    }
  }

  /**
   * Logout from all sessions
   */
  public async logoutAllSessions(): Promise<void> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.LOGOUT_ALL}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      this.clearAuthData();
      
      if (response.ok) {
        console.log('All sessions logged out');
      }
    } catch (error) {
      console.error('Logout all sessions error:', error);
      this.clearAuthData();
    }
  }

  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.REFRESH}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          this.storeTokens(data.access_token, data.refresh_token);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    if (!this.user) return false;
    
    const token = this.getToken();
    return !!token;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Get user routes and permissions
   */
  public async getUserRoutes(): Promise<UserRouteInfo | null> {
    if (this.userRoutes) {
      return this.userRoutes;
    }
    
    return await this.loadUserRoutes();
  }

  /**
   * Check if user has specific permission
   */
  public async hasPermission(permission: string): Promise<boolean> {
    try {
      const userRoutes = await this.getUserRoutes();
      if (!userRoutes) return false;
      
      return userRoutes.routes.some(route => 
        route.access && route.permissions.includes(permission)
      );
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has specific role
   */
  public hasRole(role: string): boolean {
    if (!this.user) return false;
    return this.user.roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  public hasAnyRole(roles: string[]): boolean {
    if (!this.user) return false;
    return roles.some(role => this.user!.roles.includes(role));
  }

  /**
   * Check route access
   */
  public async checkRouteAccess(route: string): Promise<RouteAccessResponse> {
    try {
      // Normalize route path: remove leading slash to avoid double slashes in URL
      const normalizedRoute = route.startsWith('/') ? route.slice(1) : route;
      
      const response = await fetch(
        `${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.ROUTE_CHECK}/${encodeURIComponent(normalizedRoute)}`,
        {
          headers: getAuthHeaders(),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`Route check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking route access:', error);
      return {
        access: false,
        message: 'Error checking route access',
        permissions: [],
        user_roles: [],
        route,
        status: 'ERROR'
      };
    }
  }

  /**
   * Get user sessions
   */
  public async getUserSessions(): Promise<SessionInfo[]> {
    if (this.sessions.length > 0) {
      return this.sessions;
    }
    
    return await this.loadUserSessions();
  }

  /**
   * Revoke specific session
   */
  public async revokeSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/sessions/revoke`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        credentials: 'include',
        body: `session_id=${sessionId}`
      });

      if (response.ok) {
        // Refresh sessions list
        await this.loadUserSessions();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error revoking session:', error);
      return false;
    }
  }

  /**
   * Get user redirect path based on roles
   */
  public async getUserRedirectPath(): Promise<string> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.USER_REDIRECT_PATH}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.redirect_path || RBAC_CONFIG.DEFAULT_REDIRECTS.DEFAULT;
      }
      
      return RBAC_CONFIG.DEFAULT_REDIRECTS.DEFAULT;
    } catch (error) {
      console.error('Error getting redirect path:', error);
      return RBAC_CONFIG.DEFAULT_REDIRECTS.DEFAULT;
    }
  }

  /**
   * Validate current authentication status
   */
  public async validateAuthentication(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/session-status`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.is_authenticated) {
          // Refresh user data
          await this.loadUserRoutes();
          return true;
        }
      }
      
      // If validation fails, clear auth data
      this.clearAuthData();
      return false;
    } catch (error) {
      console.error('Authentication validation error:', error);
      this.clearAuthData();
      return false;
    }
  }

  /**
   * Add authentication state listener
   */
  public addAuthListener(listener: (isAuthenticated: boolean, user: User | null) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove authentication state listener
   */
  public removeAuthListener(listener: (isAuthenticated: boolean, user: User | null) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Get authentication token
   */
  public getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    return localStorage.getItem('jwtToken') || 
           localStorage.getItem('access_token') || 
           localStorage.getItem('accessToken');
  }

  /**
   * Load user routes from backend
   */
  private async loadUserRoutes(): Promise<UserRouteInfo | null> {
    try {
      const navService = DynamicNavigationService.getInstance();
      const userRoutes = await navService.getUserRoutes();
      // Convert to EnhancedAuthService UserRouteInfo format if needed
      const enhancedUserRoutes: UserRouteInfo = {
        user_id: '',
        email: '',
        full_name: '',
        roles: userRoutes.roles || [],
        routes: Array.isArray(userRoutes.routes) 
          ? userRoutes.routes.map((route) => {
              if (typeof route === 'string') {
                return { route, path: route, access: true, permissions: [] };
              }
              return {
                route: route.route || route.path,
                path: route.path,
                access: route.access ?? true,
                permissions: route.permissions || []
              };
            })
          : []
      };
      this.userRoutes = enhancedUserRoutes;
      return enhancedUserRoutes;
    } catch (error) {
      console.error('Error loading user routes:', error);
      return null;
    }
  }

  /**
   * Load user sessions from backend
   */
  private async loadUserSessions(): Promise<SessionInfo[]> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/sessions`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.sessions = data;
        return data;
      }
      
      return [];
    } catch (error) {
      console.error('Error loading user sessions:', error);
      return [];
    }
  }

  /**
   * Store authentication tokens
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('jwtToken', accessToken);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    if (typeof window === 'undefined') return;
    
    // Clear route protection caches
    RouteProtectionService.getInstance().clearAllCaches();
    
    // Clear tokens
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userData');
    localStorage.removeItem('loginResponse');
    
    // Clear user data
    this.user = null;
    this.userRoutes = null;
    this.sessions = [];
    
    // Clear navigation cache
    const navService = DynamicNavigationService.getInstance();
    navService.clearCache();
    
    // Clear route protection cache
    try {
      const routeService = RouteProtectionService.getInstance();
      routeService.clearAllCaches();
    } catch (error) {
      console.warn('Error clearing route protection cache:', error);
    }
    
    // Notify listeners
    this.notifyListeners(false, null);
  }

  /**
   * Notify all listeners of authentication state changes
   */
  private notifyListeners(isAuthenticated: boolean, user: User | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(isAuthenticated, user);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }
}

export default EnhancedAuthService;
