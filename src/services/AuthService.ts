import { loginWithDevice } from '@/utils/api';
import { RBAC_CONFIG } from '@/utils/config';
import { clearChatData, clearAllUserData } from '@/utils/cookieUtils';
import InactivityService from './InactivityService';
import SessionManager from './SessionManager';
import RouteProtectionService from './RouteProtectionService';

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role_id: string;
  role_name?: string;
  permissions?: string[];
  access_token: string;
  login_flag: string;
  csrf_token?: string;
  session_id?: string;
  device_type?: string;
  device_name?: string;
  expires_at?: string;
  business_info?: Record<string, unknown>;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
  device_type?: string;
}

export interface Permission {
  resource: string;
  action: string;
  allowed: boolean;
}

class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  private listeners: ((state: AuthState) => void)[] = [];
  private sessionManager: SessionManager;

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
    this.initializeAuth();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private initializeAuth(): void {
    // Check for existing authentication on app start
    const token = this.getTokenFromStorage();
    const userData = this.getUserData();
    
    if (token && userData) {
      this.authState.user = userData;
      this.authState.isAuthenticated = true;
      this.notifyListeners();
    }
  }

  private getTokenFromStorage(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private getUserData(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const userData = localStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
    // Also set as cookie for middleware access
    document.cookie = `access_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
  }

  private setUserData(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('userData', JSON.stringify(user));
  }

  private clearAuthData(): void {
    if (typeof window === 'undefined') return;
    
    // Clear authentication data
    localStorage.removeItem('access_token');
    localStorage.removeItem('userData');
    localStorage.removeItem('loginResponse');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('user_id');
    localStorage.removeItem('role_id');
    localStorage.removeItem('login_flag');
    localStorage.removeItem('full_name');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('session_id');
    localStorage.removeItem('XSRF-TOKEN');
    localStorage.removeItem('userName');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_roles');
    sessionStorage.removeItem('isLoggingOut');
    
    // Clear all chat-related data using utility function
    clearChatData();
    
    // Clear other UI state
    localStorage.removeItem('whatsappCredentials');
    
    // Clear cookies with multiple domain/path combinations to ensure they're removed
    const cookieOptions = [
      'path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'path=/; domain=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ];
    
    cookieOptions.forEach(options => {
      document.cookie = `access_token=; ${options}`;
      document.cookie = `isAuthenticated=; ${options}`;
      document.cookie = `XSRF-TOKEN=; ${options}`;
      document.cookie = `token=; ${options}`;
      document.cookie = `refresh_token=; ${options}`;
      document.cookie = `user_id=; ${options}`;
      document.cookie = `user_email=; ${options}`;
      document.cookie = `user_roles=; ${options}`;
      document.cookie = `role_id=; ${options}`;
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener(this.authState);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public async login(credentials: LoginCredentials): Promise<User> {
    this.authState.isLoading = true;
    this.authState.error = null;
    this.notifyListeners();

    try {
      // Use the new loginWithDevice API for better session management
      const response = await loginWithDevice({
        identifier: credentials.identifier,
        password: credentials.password,
        device_type: credentials.device_type || 'Web'
      });
      
      // Prefer full name from business_info when not present at top-level
      const resolvedFullName =
        response?.full_name ||
        response?.business_info?.full_name ||
        (response?.email ? String(response.email).split('@')[0] : '');
      
      const user: User = {
        user_id: response.user_id,
        email: response.email,
        full_name: resolvedFullName,
        role_id: response.roleIds?.[0] || response.role_id, // Handle both roleIds array and role_id string
        access_token: response.access_token,
        login_flag: response.login_flag,
        csrf_token: response.csrf_token,
        session_id: response.session_id,
        device_type: response.device_type,
        device_name: response.device_name,
        expires_at: response.expires_at,
        business_info: response.business_info,
      };

      // Store authentication data
      this.setToken(response.access_token);
      this.setUserData(user);
      
      // Set CSRF token cookie for frontend use (if backend does not already do this)
      if (typeof window !== 'undefined' && response.csrf_token) {
        document.cookie = `XSRF-TOKEN=${response.csrf_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        // Also mirror in localStorage for easy header injection fallback
        try { localStorage.setItem('XSRF-TOKEN', response.csrf_token); } catch (error) {
          console.warn('Failed to set CSRF token in localStorage:', error);
        }
      }
      
      // Store complete login response for business info access
      if (typeof window !== 'undefined') {
        localStorage.setItem('loginResponse', JSON.stringify(response));
        try {
          // Mirror common fields for components that read directly from localStorage
          localStorage.setItem('userName', resolvedFullName || '');
          localStorage.setItem('userEmail', response.email || '');
          if (response.user_id) localStorage.setItem('user_id', response.user_id);
          const derivedRoleId = user.role_id || '';
          if (derivedRoleId) localStorage.setItem('role_id', derivedRoleId);
          if (response.login_flag) localStorage.setItem('login_flag', response.login_flag);
          if (response.session_id) localStorage.setItem('session_id', response.session_id);
        } catch (error) {
          console.warn('Failed to set user data in localStorage:', error);
        }
      }
      
      // Set authentication cookie and mirror tokens for API calls
      document.cookie = `isAuthenticated=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
      try {
        localStorage.setItem('access_token', response.access_token);
      } catch (error) {
        console.warn('Failed to set access token in localStorage:', error);
      }

      // Update state
      this.authState.user = user;
      this.authState.isAuthenticated = true;
      this.authState.isLoading = false;
      
      // Flag to force cookie consent check after navigation
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('showConsentAfterLogin', 'true');
        } catch (error) {
          console.warn('Failed to set showConsentAfterLogin in sessionStorage:', error);
        }
      }

      // Notify listeners immediately
      this.notifyListeners();
      
      // Force a second notification after a small delay to ensure all components are updated
      setTimeout(() => {
        this.notifyListeners();
      }, 100);

      // Dispatch custom event for cookie banner
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userLoggedIn', {
          detail: { user, sessionInfo: response }
        }));
      }

      // Initialize route protection services after successful login
      try {
        // Import services dynamically to avoid circular dependencies
        const { default: RouteGuard } = await import('./RouteGuard');
        const { default: NavigationService } = await import('./NavigationService');
        
        // Initialize services in parallel
        await Promise.all([
          RouteGuard.getInstance().initialize(),
          NavigationService.getInstance().initialize(),
        ]);

        // Start inactivity tracking after successful login
        InactivityService.getInstance().start();
        
        // Start session activity tracking
        this.sessionManager.startActivityTracking();
      } catch (error) {
        console.error('AuthService: Error initializing route protection services:', error);
        // Don't fail login if route protection initialization fails
      }

      return user;
    } catch (error) {
      this.authState.error = error instanceof Error ? error.message : 'Login failed';
      this.authState.isLoading = false;
      this.notifyListeners();
      throw error;
    }
  }

  public async logout(logoutAll: boolean = false): Promise<void> {
    try {
      // Set logout flag
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('isLoggingOut', 'true');
      }

      // Stop services before logout
      InactivityService.getInstance().stop();
      this.sessionManager.stopActivityTracking();
      
      // Call appropriate logout endpoint with timeout and timing log
      const nowTs = () => (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
      const startTs = nowTs();
      let logoutResponse;
      if (logoutAll) {
        logoutResponse = await this.sessionManager.logoutAllSessions();
      } else {
        logoutResponse = await this.sessionManager.logoutCurrentSession();
      }
      const endTs = nowTs();
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Auth logout latency: ${Math.round(endTs - startTs)}ms`);
      }

      // Clear all authentication data
      this.clearAuthData();
      
      // Clear route protection caches
      RouteProtectionService.getInstance().clearAllCaches();
      
      // Clear authentication cookie
      document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      // Update state
      this.authState.user = null;
      this.authState.isAuthenticated = false;
      this.authState.error = null;
      this.notifyListeners();

      // Dispatch custom event to notify other components about logout
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userLoggedOut', {
          detail: { 
            timestamp: Date.now(),
            logoutAll,
            response: logoutResponse
          }
        }));
      }

      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
    } catch (error) {
      // Logout error - silent handling
      
      // Force logout even if there's an error
      this.clearAuthData();
      
      // Use comprehensive cleanup as fallback
      try {
        clearAllUserData();
      } catch (cleanupError) {
        // Error during comprehensive cleanup - log warning
        console.warn('Error during comprehensive cleanup:', cleanupError);
      }
      
      // Stop services
      InactivityService.getInstance().stop();
      this.sessionManager.stopActivityTracking();
      
      this.authState.user = null;
      this.authState.isAuthenticated = false;
      this.notifyListeners();
      
      // Dispatch custom event to notify other components about logout
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userLoggedOut', {
          detail: { 
            timestamp: Date.now(),
            logoutAll,
            error: error instanceof Error ? error.message : 'Logout failed'
          }
        }));
      }
      
      // Force redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
    }
  }

  public getCurrentUser(): User | null {
    return this.authState.user;
  }

  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  public getToken(): string | null {
    return this.getTokenFromStorage();
  }

  public async refreshUserPermissions(): Promise<void> {
    if (!this.authState.user) return;

    try {
      // Fetch updated user permissions from backend
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.USER_ROUTES}`, {
        headers: {
          'Authorization': `Bearer ${this.getTokenFromStorage()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.authState.user.permissions = data.permissions;
        this.setUserData(this.authState.user);
        this.notifyListeners();
      }
    } catch (error) {
      // Error refreshing permissions - log warning
      console.warn('Error refreshing user permissions:', error);
    }
  }

  public hasPermission(resource: string, action: string): boolean {
    if (!this.authState.user?.permissions) return false;
    
    const permission = `${resource}:${action}`;
    return this.authState.user.permissions.includes(permission);
  }

  public hasRole(roleId: string): boolean {
    return this.authState.user?.role_id === roleId;
  }

  public hasAnyRole(roleIds: string[]): boolean {
    return roleIds.includes(this.authState.user?.role_id || '');
  }

  public getState(): AuthState {
    return { ...this.authState };
  }

  public getLoginResponse(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const loginResponse = localStorage.getItem('loginResponse');
      return loginResponse ? JSON.parse(loginResponse) : null;
    } catch (error) {
      // Error parsing login response - log warning and return null
      console.warn('Error parsing login response:', error);
      return null;
    }
  }

  public setError(error: string | null): void {
    this.authState.error = error;
    this.notifyListeners();
  }

  public clearError(): void {
    this.authState.error = null;
    this.notifyListeners();
  }

  // Session Management Methods
  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  public async refreshToken(): Promise<unknown> {
    try {
      return await this.sessionManager.refreshToken();
    } catch (error) {
      // Error refreshing token - silent handling
      // If refresh fails, logout user
      await this.logout();
      throw error;
    }
  }

  public async getSessions() {
    return await this.sessionManager.getSessions();
  }

  public async logoutAllDevices(): Promise<void> {
    return await this.logout(true);
  }

  public async revokeSession(sessionId: string) {
    return await this.sessionManager.revokeSession(sessionId);
  }

  public async getMyActivity() {
    return await this.sessionManager.getMyActivity();
  }

  public async clearUserCache() {
    return await this.sessionManager.clearUserCache();
  }

  public subscribeToSessions(listener: (sessions: unknown[]) => void) {
    return this.sessionManager.subscribeToSessions(listener);
  }

  public subscribeToPresence(listener: (presence: unknown) => void) {
    return this.sessionManager.subscribeToPresence(listener);
  }
}

export default AuthService; 