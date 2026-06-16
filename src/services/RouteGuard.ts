import AuthService from './AuthService';
import RouteProtectionService from './RouteProtectionService';
import { RBAC_CONFIG } from '@/utils/config';

export interface RouteConfig {
  path: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  allowedRoles?: string[];
  redirectTo?: string;
}

export interface RouteGuardConfig {
  routes: RouteConfig[];
  defaultRedirect: string;
  unauthorizedRedirect: string;
}

/**
 * RouteGuard Service
 * Now uses backend API via RouteProtectionService
 * Removed hardcoded routes - all route access checks go through backend
 */
class RouteGuard {
  private static instance: RouteGuard;
  private authService: AuthService;
  private routeProtectionService: RouteProtectionService;
  private defaultRedirect: string = RBAC_CONFIG.DEFAULT_REDIRECTS.DEFAULT;
  private unauthorizedRedirect: string = RBAC_CONFIG.DEFAULT_REDIRECTS.UNAUTHORIZED;
  private accessibleRoutes: string[] = [];
  private routesLoaded: boolean = false;

  private constructor() {
    this.authService = AuthService.getInstance();
    this.routeProtectionService = RouteProtectionService.getInstance();
  }

  public static getInstance(): RouteGuard {
    if (!RouteGuard.instance) {
      RouteGuard.instance = new RouteGuard();
    }
    return RouteGuard.instance;
  }

  public async initialize(): Promise<void> {
    // Check if user is authenticated before making API calls
    if (!this.authService.isAuthenticated() || !this.authService.getToken()) {
      this.accessibleRoutes = [];
      this.routesLoaded = true;
      return;
    }

    try {
      // Load routes from backend API
      const routes = await this.routeProtectionService.getAccessibleRoutes();
      this.accessibleRoutes = routes;
      this.routesLoaded = true;
    } catch (error) {
      console.error('RouteGuard: Failed to load routes from backend:', error);
      this.accessibleRoutes = [];
      this.routesLoaded = true;
    }
  }

  /**
   * Check if user can access a route
   * Uses backend API via RouteProtectionService
   */
  public canAccessRoute(path: string): { allowed: boolean; redirectTo?: string } {
    // Check if route is public first - allow access without authentication
    if (this.isPublicRoute(path)) {
      return { allowed: true };
    }

    const user = this.authService.getCurrentUser();
    
    if (!user) {
      return { allowed: false, redirectTo: this.unauthorizedRedirect };
    }

    // Check cached accessible routes first (fast path)
    if (this.accessibleRoutes.includes(path)) {
      return { allowed: true };
    }

    // If routes haven't been loaded yet, return pending state
    // The async checkRouteAccess should be used instead
    if (!this.routesLoaded) {
      // Return allowed temporarily to prevent blocking during initialization
      return { allowed: true };
    }

    // Route not in accessible routes list - deny access
    return { 
      allowed: false, 
      redirectTo: this.defaultRedirect 
    };
  }

  public async checkPermission(resource: string, action: string): Promise<boolean> {
    // Delegate to RouteProtectionService
    return this.routeProtectionService.hasPermission(`${resource}:${action}`);
  }

  public async checkRoleAccess(roleIds: string[]): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    // Check if user's role is in the allowed list
    return roleIds.includes(user.role_id);
  }

  /**
   * Check route access using backend API
   */
  public async checkRouteAccess(routePath: string): Promise<boolean> {
    // Use RouteProtectionService to check with backend
    const accessResponse = await this.routeProtectionService.checkRouteAccess(routePath);
    
    // Update accessible routes cache if access granted
    if (accessResponse.access && !this.accessibleRoutes.includes(routePath)) {
      this.accessibleRoutes.push(routePath);
    }

    return accessResponse.access;
  }

  /**
   * Get accessible routes from backend API
   */
  public getAccessibleRoutes(): string[] {
    return this.accessibleRoutes;
  }

  /**
   * Get default redirect path from backend
   */
  public async getDefaultRedirect(): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) return this.unauthorizedRedirect;

    try {
      const redirectPath = await this.routeProtectionService.getUserRedirectPath();
      return redirectPath.redirect_path || this.defaultRedirect;
    } catch (error) {
      console.error('RouteGuard: Failed to get redirect path from backend:', error);
      return this.defaultRedirect;
    }
  }

  public isPublicRoute(path: string): boolean {
    // Check exact match first
    if (RBAC_CONFIG.PUBLIC_ROUTES.includes(path)) {
      return true;
    }
    
    // Check if path starts with any public route (for dynamic routes like /survey/{id})
    return RBAC_CONFIG.PUBLIC_ROUTES.some(route => path.startsWith(route));
  }

  public shouldRedirect(path: string): { should: boolean; redirectTo?: string } {
    if (this.isPublicRoute(path)) {
      return { should: false };
    }

    const { allowed, redirectTo } = this.canAccessRoute(path);
    
    if (!allowed) {
      return { should: true, redirectTo };
    }

    return { should: false };
  }
}

export default RouteGuard; 