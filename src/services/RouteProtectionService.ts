import AuthService from './AuthService';
import { RBAC_CONFIG } from '@/utils/config';
import {
  RouteAccessResponse,
  UserRoutesResponse,
  RolePathsResponse,
  UserPathsResponse,
  BackendRoute,
} from '@/types/rbac';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class RouteProtectionService {
  private static instance: RouteProtectionService;
  private authService: AuthService;

  // Caching for route access
  private routeCache: Map<string, CacheEntry<RouteAccessResponse>> = new Map();
  private userRoutesCache: CacheEntry<UserRoutesResponse | null> | null = null;
  private userPathsCache: CacheEntry<UserPathsResponse | null> | null = null;
  private accessibleRoutesCache: CacheEntry<string[]> | null = null;

  // Cache TTL in milliseconds (5 minutes for routes, 1 minute for route checks)
  private readonly ROUTE_CACHE_TTL = RBAC_CONFIG.CACHE.ROUTE_TTL || 60000;
  private readonly USER_ROUTES_CACHE_TTL = RBAC_CONFIG.CACHE.NAVIGATION_TTL || 300000;
  // Cookie cache TTL in seconds (5 minutes, not 7 days)
  private readonly COOKIE_CACHE_TTL = 300; // 5 minutes in seconds

  // Add cache version to detect stale data
  private cacheVersion: number = 0;

  private constructor() {
    this.authService = AuthService.getInstance();
    // Clear cache on auth state changes
    this.setupCacheInvalidation();
  }

  private setupCacheInvalidation(): void {
    // Clear cache when user logs out or changes
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'access_token' && !e.newValue) {
          this.clearCache();
        }
      });
    }
  }

  /**
   * Clear cookie cache (accessible_routes)
   */
  private clearCookieCache(): void {
    if (typeof document !== 'undefined') {
      document.cookie = 'accessible_routes=; path=/; max-age=0; SameSite=Strict';
      console.log('🗑️ RouteProtectionService: Cleared accessible_routes cookie');
    }
  }

  /**
   * Clear all cached data (including cookie)
   */
  public clearCache(): void {
    console.log('🗑️ RouteProtectionService: Clearing all route caches...');
    this.routeCache.clear();
    this.userRoutesCache = null;
    this.userPathsCache = null;
    this.accessibleRoutesCache = null;
    this.cacheVersion++; // Increment version to invalidate any stale references
    this.clearCookieCache(); // Clear cookie cache
    console.log('✅ RouteProtectionService: All caches cleared');
  }

  /**
   * Clear cache for a specific route
   */
  public clearRouteCache(route: string): void {
    console.log(`🗑️ RouteProtectionService: Clearing cache for route: ${route}`);
    this.routeCache.delete(route);
    // Also clear variations of the route (with/without leading slash)
    const normalizedRoute = route.startsWith('/') ? route.slice(1) : route;
    const routeWithSlash = route.startsWith('/') ? route : `/${route}`;
    this.routeCache.delete(normalizedRoute);
    this.routeCache.delete(routeWithSlash);
  }

  /**
   * Clear all route caches and force refresh
   */
  public clearAllCaches(): void {
    console.log('🗑️ RouteProtectionService: Force clearing ALL caches...');
    this.clearCache();
    // Also clear any other related caches
    if (typeof window !== 'undefined') {
      // Clear localStorage cache if any
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('route') || key.includes('navigation') || key.includes('accessible')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Error clearing localStorage cache:', e);
      }
    }
    console.log('✅ RouteProtectionService: All caches force cleared');
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
  }

  /**
   * Get cached data or null if expired/invalid
   */
  private getCached<T>(entry: CacheEntry<T> | null): T | null {
    if (this.isCacheValid(entry)) {
      return entry!.data;
    }
    return null;
  }

  public static getInstance(): RouteProtectionService {
    if (!RouteProtectionService.instance) {
      RouteProtectionService.instance = new RouteProtectionService();
    }
    return RouteProtectionService.instance;
  }

  /**
   * Get user routes and roles (with caching)
   */
  async getUserRoutes(forceRefresh: boolean = false): Promise<UserRoutesResponse | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCached(this.userRoutesCache);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || RBAC_CONFIG.BACKEND_URL;
      if (!apiUrl) {
        console.error('API URL not configured');
        return null;
      }

      const response = await fetch(`${apiUrl}/api/v1/frontend-routes/user/routes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Explicitly disable Next.js caching
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('User routes endpoint returned 401 Unauthorized - clearing all caches');
          this.clearAllCaches(); // Clear all caches on 401
          return null;
        } else if (response.status === 404) {
          console.warn('User routes endpoint not found (404) - this might be expected if RBAC is not fully configured');
          return null;
        } else if (response.status === 403) {
          console.warn('User routes endpoint returned 403 Forbidden - user may not have permission');
          return null;
        }
        throw new Error(`Failed to fetch user routes: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result
      this.userRoutesCache = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.USER_ROUTES_CACHE_TTL,
      };

      return data;
    } catch (error) {
      console.error('Error fetching user routes:', error);
      // Return null instead of throwing to prevent app crashes
      return null;
    }
  }

  /**
   * Get user paths (enhanced endpoint with accessible/restricted paths and statistics)
   */
  async getUserPaths(forceRefresh: boolean = false): Promise<UserPathsResponse | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCached(this.userPathsCache);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || RBAC_CONFIG.BACKEND_URL;
      if (!apiUrl) {
        console.error('API URL not configured');
        return null;
      }

      const response = await fetch(`${apiUrl}/api/v1/frontend-routes/user/paths`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Explicitly disable Next.js caching
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('User paths endpoint returned 401 Unauthorized - clearing all caches');
          this.clearAllCaches(); // Clear all caches on 401
          return null;
        } else if (response.status === 404) {
          console.warn('User paths endpoint not found (404) - falling back to user/routes endpoint');
          return null;
        } else if (response.status === 403) {
          console.warn('User paths endpoint returned 403 Forbidden - user may not have permission');
          return null;
        }
        throw new Error(`Failed to fetch user paths: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result
      this.userPathsCache = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.USER_ROUTES_CACHE_TTL,
      };

      console.log('✅ RouteProtectionService: User paths fetched successfully', {
        accessible_count: data.user_paths?.statistics?.accessible_count || 0,
        restricted_count: data.user_paths?.statistics?.restricted_count || 0,
        total_routes: data.user_paths?.statistics?.total_routes || 0,
      });

      return data;
    } catch (error) {
      console.error('Error fetching user paths:', error);
      // Return null instead of throwing to prevent app crashes
      return null;
    }
  }

  /**
   * Get role-based paths
   */
  async getRolePaths(): Promise<RolePathsResponse> {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/frontend-routes/role-paths`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch role paths: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching role paths:', error);
      throw error;
    }
  }

  /**
   * Check specific route access with strict backend validation (with caching)
   */
  async checkRouteAccess(route: string, forceRefresh: boolean = false): Promise<RouteAccessResponse> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.routeCache.get(route);
      const cachedData = this.getCached(cached || null);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    try {
      const token = this.authService.getToken();
      if (!token) {
        const response: RouteAccessResponse = {
          hasAccess: false,
          access: false,
          message: 'No authentication token available',
          reason: 'UNAUTHENTICATED',
          status: 'UNAUTHENTICATED',
          status_code: 401
        };
        return response;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || RBAC_CONFIG.BACKEND_URL;
      if (!apiUrl) {
        console.error('API URL not configured');
        return {
          hasAccess: false,
          access: false,
          message: 'API URL not configured',
          reason: 'ERROR',
          route: route,
          status: 'ERROR',
          status_code: 500
        } as RouteAccessResponse;
      }

      // Normalize route path: remove leading slash to avoid double slashes in URL
      const normalizedRoute = route.startsWith('/') ? route.slice(1) : route;

      const response = await fetch(`${apiUrl}/api/v1/frontend-routes/routes/check/${encodeURIComponent(normalizedRoute)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Explicitly disable Next.js caching
      });

      let result: RouteAccessResponse;

      if (response.ok) {
        const data = await response.json();
        result = {
          hasAccess: data.access === true,
          access: data.access === true,
          message: data.message || 'Access granted',
          permissions: data.permissions || [],
          user_roles: data.user_roles || [],
          route: data.route || route,
          status: data.status || 'ACCESS_GRANTED',
          status_code: 200
        } as RouteAccessResponse;
      } else if (response.status === 404) {
        // STRICT: Route not found = deny access
        const errorData = await response.json().catch(() => ({}));
        result = {
          hasAccess: false,
          access: false,
          message: errorData.message || `Route not found or not assigned to your role: ${route}`,
          reason: 'ROUTE_NOT_FOUND',
          route: route,
          status: 'ROUTE_NOT_FOUND',
          status_code: 404
        } as RouteAccessResponse;
      } else if (response.status === 403) {
        // STRICT: Access denied from backend
        const errorData = await response.json().catch(() => ({}));
        result = {
          hasAccess: false,
          access: false,
          message: errorData.message || 'Access denied - Route not assigned to your role',
          reason: 'ACCESS_DENIED',
          route: route,
          status: 'ACCESS_DENIED',
          user_roles: errorData.user_roles || [],
          required_roles: errorData.required_roles || [],
          status_code: 403
        } as RouteAccessResponse;
      } else if (response.status === 401) {
        // STRICT: Authentication issues = deny access and clear all caches
        this.clearAllCaches(); // Clear all caches on 401
        result = {
          hasAccess: false,
          access: false,
          message: 'Authentication required',
          reason: 'UNAUTHENTICATED',
          route: route,
          status: 'UNAUTHENTICATED',
          status_code: 401
        } as RouteAccessResponse;
      } else {
        // STRICT: Any other error = deny access
        const errorData = await response.json().catch(() => ({}));
        result = {
          hasAccess: false,
          access: false,
          message: errorData.message || `Access check failed: ${response.statusText}`,
          reason: 'ERROR',
          route: route,
          status: 'ERROR',
          status_code: response.status
        } as RouteAccessResponse;
      }

      // Cache the result (cache both grants and denials to prevent repeated checks)
      // Don't cache 401 (auth errors) as they might be temporary
      if (response.status !== 401) {
        this.routeCache.set(route, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.ROUTE_CACHE_TTL,
        });
      }

      return result;
    } catch (error) {
      console.error('Route access check failed:', error);

      const result: RouteAccessResponse = {
        hasAccess: false,
        access: false,
        message: 'Failed to check route access',
        reason: 'ERROR',
        route: route,
        status: 'ERROR',
        status_code: 500
      };

      return result;
    }
  }

  /**
   * Get user redirect path
   */
  async getUserRedirectPath(): Promise<{ success: boolean; redirect_path: string; role: string; description: string }> {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/frontend-routes/user/redirect-path`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user redirect path: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user redirect path:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to multiple routes
   */
  async checkMultipleRoutes(routes: string[]): Promise<Record<string, RouteAccessResponse>> {
    const results: Record<string, RouteAccessResponse> = {};

    await Promise.all(
      routes.map(async (route) => {
        results[route] = await this.checkRouteAccess(route);
      })
    );

    return results;
  }

  /**
   * Get all accessible routes for current user (with caching)
   */
  async getAccessibleRoutes(forceRefresh: boolean = false): Promise<string[]> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCached(this.accessibleRoutesCache);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const userRoutes = await this.getUserRoutes(forceRefresh);
      if (userRoutes && userRoutes.routes) {
        const routes = userRoutes.routes
          .filter((route: BackendRoute) => route.access)
          .map((route: BackendRoute) => route.path);

        // Cache the result
        this.accessibleRoutesCache = {
          data: routes,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.USER_ROUTES_CACHE_TTL,
        };

        return routes;
      }
      return [];
    } catch (error) {
      console.error('Error getting accessible routes:', error);
      return [];
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission: string): Promise<boolean> {
    try {
      const userRoutes = await this.getUserRoutes();
      if (userRoutes && userRoutes.routes) {
        return userRoutes.routes.some((route: BackendRoute) =>
          route.permissions && route.permissions.includes(permission)
        );
      }
      return false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(permissions: string[]): Promise<boolean> {
    try {
      const userRoutes = await this.getUserRoutes();
      if (userRoutes && userRoutes.routes) {
        return userRoutes.routes.some((route: BackendRoute) =>
          route.permissions && route.permissions.some((permission: string) => permissions.includes(permission))
        );
      }
      return false;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Check system initialization status
   */
  async getSystemStatus(): Promise<{ is_initialized: boolean; routes_count: number; mappings_count: number }> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/frontend-routes/system-status`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch system status: ${response.statusText}`);
      }

      const data = await response.json();
      return data.system_status || { is_initialized: false, routes_count: 0, mappings_count: 0 };
    } catch (error) {
      console.error('Error fetching system status:', error);
      return { is_initialized: false, routes_count: 0, mappings_count: 0 };
    }
  }

  /**
   * Initialize system with default routes
   */
  async initializeSystem(): Promise<{ success: boolean; message: string; initialized_roles: string[] }> {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('Authentication required for system initialization');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/frontend-routes/system/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize system: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error initializing system:', error);
      throw error;
    }
  }

  /**
   * Get all available routes for admin management
   */
  async getAllRoutes(): Promise<{ success: boolean; routes: BackendRoute[]; count: number }> {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/frontend-routes/routes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch routes: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all routes:', error);
      throw error;
    }
  }

  /**
   * Get routes assigned to a specific role
   */
  async getRoutesForRole(roleName: string): Promise<{ success: boolean; routes: BackendRoute[]; count: number }> {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/frontend-routes/routes/for-role/${encodeURIComponent(roleName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch routes for role: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching routes for role:', error);
      throw error;
    }
  }

  /**
   * Validate access for multiple routes at once
   */
  async validateMultipleRoutes(routes: string[]): Promise<{ user_roles: string[]; validation_results: RouteAccessResponse[]; granted_access: number; denied_access: number }> {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/frontend-routes/routes/validate-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routes),
      });

      if (!response.ok) {
        throw new Error(`Failed to validate routes: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating multiple routes:', error);
      throw error;
    }
  }

  /**
   * Get all role-route mappings
   */
  async getAllMappings(): Promise<{ success: boolean; mappings: unknown[]; count: number }> {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/frontend-routes/mappings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch mappings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all mappings:', error);
      throw error;
    }
  }

  /**
   * Bulk assign routes to a role
   */
  async bulkAssignRoutesToRole(roleName: string, routeData: { route_paths: string[] }): Promise<unknown> {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/frontend-routes/roles/${encodeURIComponent(roleName)}/bulk-assign-routes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeData),
      });

      if (!response.ok) {
        throw new Error(`Failed to assign routes to role: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error assigning routes to role:', error);
      throw error;
    }
  }

  /**
   * Remove routes from a role
   */
  async removeRoutesFromRole(roleName: string, routePaths: string[]): Promise<unknown> {
    try {
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/frontend-routes/roles/${encodeURIComponent(roleName)}/remove-routes`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routePaths),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove routes from role: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing routes from role:', error);
      throw error;
    }
  }
}

export default RouteProtectionService; 