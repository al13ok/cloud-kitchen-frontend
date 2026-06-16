import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import RouteProtectionService from '@/services/RouteProtectionService';
import { RouteAccessResponse, UserRoutesResponse, UserPathsResponse, BackendRoute, PathStatistics } from '@/types/rbac';
import { useAuth } from './useAuth';
import { RBAC_CONFIG } from '@/utils/config';

export interface UseRouteProtectionReturn {
  // State
  isLoading: boolean;
  isInitialized: boolean;
  accessibleRoutes: string[];
  restrictedRoutes: string[];
  userRoutes: UserRoutesResponse | null;
  userPaths: UserPathsResponse | null; // Expose userPaths for direct access to user_roles
  pathStatistics: PathStatistics | null;

  // Route checking methods
  canAccessRoute: (route: string) => Promise<boolean>;
  checkRouteAccess: (route: string) => Promise<RouteAccessResponse>;
  isRouteAccessible: (route: string) => boolean;
  isRouteRestricted: (route: string) => boolean;

  // Permission methods
  hasPermission: (permission: string) => Promise<boolean>;
  hasAnyPermission: (permissions: string[]) => Promise<boolean>;

  // Utility methods
  refreshRoutes: () => Promise<void>;
  clearAllCaches: () => void;
  getRoutePermissions: (route: string) => string[];
  getRestrictionReason: (route: string) => string | null;

  // Current route status
  currentRouteAccess: RouteAccessResponse | null;
}

/**
 * React hook for route protection using backend API
 * Provides route access checking, permissions, and caching
 */
export function useRouteProtection(): UseRouteProtectionReturn {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [accessibleRoutes, setAccessibleRoutes] = useState<string[]>([]);
  const [restrictedRoutes, setRestrictedRoutes] = useState<string[]>([]);
  const [userRoutes, setUserRoutes] = useState<UserRoutesResponse | null>(null);
  const [userPaths, setUserPaths] = useState<UserPathsResponse | null>(null);
  const [pathStatistics, setPathStatistics] = useState<PathStatistics | null>(null);
  const [currentRouteAccess, setCurrentRouteAccess] = useState<RouteAccessResponse | null>(null);

  const routeProtectionService = RouteProtectionService.getInstance();

  // Cookie TTL in seconds (5 minutes, not 7 days)
  const COOKIE_CACHE_TTL = 300; // 5 minutes

  /**
   * Load user routes from backend
   */
  const loadRoutes = useCallback(async (forceRefresh: boolean = false) => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      setIsInitialized(true);
      setAccessibleRoutes([]);
      setUserRoutes(null);
      // Clear cookie on logout
      if (typeof document !== 'undefined') {
        document.cookie = 'accessible_routes=; path=/; max-age=0; SameSite=Strict';
      }
      return;
    }

    try {
      setIsLoading(true);

      // Clear cache if forcing refresh
      if (forceRefresh) {
        console.log('🔄 useRouteProtection: Force refresh requested, clearing caches...');
        routeProtectionService.clearAllCaches();
        setAccessibleRoutes([]);
        setCurrentRouteAccess(null);
      }

      // Try enhanced /user/paths endpoint first (includes accessible/restricted paths and statistics)
      let userPaths: UserPathsResponse | null = null;
      try {
        userPaths = await routeProtectionService.getUserPaths(forceRefresh);
      } catch (error) {
        console.warn('⚠️ useRouteProtection: Error fetching user paths, falling back to user routes:', error);
      }

      if (userPaths && userPaths.user_paths) {
        // Use enhanced endpoint response
        const paths = userPaths.user_paths;

        // Extract accessible routes - normalize paths for consistent matching
        const accessible = (paths.accessible_paths || []).map((path: string) => {
          // Ensure path starts with / for consistency
          return path.startsWith('/') ? path : `/${path}`;
        });

        // Extract restricted routes
        const restricted = (paths.restricted_paths || []).map((path: string) => {
          // Ensure path starts with / for consistency
          return path.startsWith('/') ? path : `/${path}`;
        });

        // Convert to UserRoutesResponse format for backward compatibility
        const routesResponse: UserRoutesResponse = {
          roles: paths.user_roles || [],
          routes: (paths.accessible_paths_details || []).map((detail) => ({
            path: detail.path,
            access: true,
            permissions: detail.permissions || [],
          })),
        };

        setUserRoutes(routesResponse);
        setUserPaths(userPaths);
        setPathStatistics(paths.statistics || null);
        setRestrictedRoutes(restricted);
        console.log('✅ useRouteProtection: Loaded routes from enhanced /user/paths endpoint', {
          accessible_count: paths.statistics?.accessible_count || accessible.length,
          restricted_count: paths.statistics?.restricted_count || restricted.length,
          total_routes: paths.statistics?.total_routes || 0,
          access_percentage: paths.statistics?.access_percentage || 0,
        });
        setAccessibleRoutes(accessible);
        // Store accessible routes in cookie for middleware (5 minutes TTL, not 7 days)
        if (typeof document !== 'undefined') {
          try {
            const cookieValue = JSON.stringify(accessible);
            document.cookie = `accessible_routes=${encodeURIComponent(cookieValue)}; path=/; max-age=${COOKIE_CACHE_TTL}; SameSite=Strict`;
            console.log('✅ useRouteProtection: Stored accessible routes in cookie for middleware (5min TTL)');
          } catch (error) {
            console.warn('⚠️ useRouteProtection: Failed to store accessible routes in cookie:', error);
          }
        }
      } else {
        // Fallback to old /user/routes endpoint
        console.log('🔄 useRouteProtection: Using fallback /user/routes endpoint');
        const routes = await routeProtectionService.getUserRoutes(forceRefresh);
        setUserRoutes(routes);

        if (routes && routes.routes) {
          // Extract accessible routes - normalize paths for consistent matching
          const accessible = routes.routes
            .filter((route: BackendRoute) => route.access)
            .map((route: BackendRoute) => {
              // Ensure path starts with / for consistency
              const path = route.path || '';
              return path.startsWith('/') ? path : `/${path}`;
            });

          console.log('✅ useRouteProtection: Loaded accessible routes from fallback endpoint:', accessible);
          setAccessibleRoutes(accessible);
          // Store accessible routes in cookie (5 minutes TTL)
          if (typeof document !== 'undefined') {
            try {
              const cookieValue = JSON.stringify(accessible);
              document.cookie = `accessible_routes=${encodeURIComponent(cookieValue)}; path=/; max-age=${COOKIE_CACHE_TTL}; SameSite=Strict`;
              console.log('✅ useRouteProtection: Stored accessible routes in cookie for middleware (5min TTL)');
            } catch (error) {
              console.warn('⚠️ useRouteProtection: Failed to store accessible routes in cookie:', error);
            }
          }
        } else {
          console.warn('⚠️ useRouteProtection: No routes found in backend response');
          setAccessibleRoutes([]);
          // Clear cookie if no routes
          if (typeof document !== 'undefined') {
            document.cookie = 'accessible_routes=; path=/; max-age=0; SameSite=Strict';
          }
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Error loading routes:', error);
      // Clear caches on error
      routeProtectionService.clearAllCaches();
      setAccessibleRoutes([]);
      setUserRoutes(null);
      setCurrentRouteAccess(null);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, routeProtectionService]);

  /**
   * Check if user can access a specific route
   */
  const canAccessRoute = useCallback(async (route: string): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    // First check cache (accessible routes list)
    if (accessibleRoutes.includes(route)) {
      return true;
    }

    // If not in cache, check with backend
    try {
      const accessResponse = await routeProtectionService.checkRouteAccess(route);

      // Update accessible routes if access granted
      if (accessResponse.access && !accessibleRoutes.includes(route)) {
        setAccessibleRoutes(prev => [...prev, route]);
      }

      return accessResponse.access;
    } catch (error) {
      console.error('Error checking route access:', error);
      return false;
    }
  }, [isAuthenticated, accessibleRoutes, routeProtectionService]);

  /**
   * Normalize route path for comparison (handle trailing slashes, etc.)
   */
  const normalizeRoutePath = useCallback((path: string): string => {
    if (!path) return '';
    // Remove trailing slash for consistent comparison (except root)
    return path === '/' ? path : path.replace(/\/+$/, '');
  }, []);

  /**
   * Check if route matches (handles path variations)
   */
  const routeMatches = useCallback((route1: string, route2: string): boolean => {
    const normalized1 = normalizeRoutePath(route1);
    const normalized2 = normalizeRoutePath(route2);
    return normalized1 === normalized2;
  }, [normalizeRoutePath]);

  /**
   * Check route access and return full response
   * First checks accessibleRoutes cache, then backend if needed
   */
  const checkRouteAccess = useCallback(async (route: string): Promise<RouteAccessResponse> => {
    // Check if route is public first - allow access without authentication
    const isPublicRoute = RBAC_CONFIG.PUBLIC_ROUTES.some(publicRoute => 
      route === publicRoute || route.startsWith(publicRoute)
    );
    
    if (isPublicRoute) {
      return {
        access: true,
        hasAccess: true,
        message: 'Access granted - public route',
        status: 'ACCESS_GRANTED',
        status_code: 200,
        route,
      };
    }

    if (!isAuthenticated) {
      return {
        access: false,
        hasAccess: false,
        message: 'User not authenticated',
        reason: 'UNAUTHENTICATED',
        status: 'UNAUTHENTICATED',
        status_code: 401,
        route,
      };
    }

    // FAST CHECK: If route is in accessibleRoutes, return granted immediately - TRUST THIS COMPLETELY
    // Routes in accessibleRoutes come from backend and are already assigned to user's role
    if (accessibleRoutes && accessibleRoutes.length > 0) {
      // Normalize the route to check (ensure it has leading slash to match backend format)
      const normalizedCheckRoute = route.startsWith('/') ? route : `/${route}`;
      const normalizedRouteForComparison = normalizeRoutePath(normalizedCheckRoute);

      // Check exact match first (with leading slash)
      if (accessibleRoutes.includes(normalizedCheckRoute) || accessibleRoutes.includes(route)) {
        console.log(`✅ useRouteProtection: Route "${route}" found in accessibleRoutes (exact match) - TRUSTING and allowing access without backend call`);
        return {
          access: true,
          hasAccess: true,
          message: 'Access granted',
          status: 'ACCESS_GRANTED',
          status_code: 200,
          route,
        };
      }

      // Check normalized paths (handle trailing slashes, etc.)
      const isAccessible = accessibleRoutes.some(accessibleRoute => {
        const normalizedAccessible = normalizeRoutePath(accessibleRoute);

        // Exact normalized match
        if (normalizedAccessible === normalizedRouteForComparison) {
          return true;
        }

        // Check if route matches accessibleRoute with or without leading slash
        const accessibleWithoutSlash = accessibleRoute.startsWith('/') ? accessibleRoute.slice(1) : accessibleRoute;
        const routeWithoutSlash = normalizedCheckRoute.startsWith('/') ? normalizedCheckRoute.slice(1) : normalizedCheckRoute;
        if (accessibleWithoutSlash === routeWithoutSlash) {
          return true;
        }

        // Check wildcard routes (e.g., /customer/* matches /customer/123)
        if (accessibleRoute.includes('/*')) {
          const baseRoute = accessibleRoute.replace('/*', '');
          const normalizedBase = normalizeRoutePath(baseRoute);
          return normalizedRouteForComparison.startsWith(normalizedBase + '/') || normalizedRouteForComparison === normalizedBase;
        }

        return false;
      });

      if (isAccessible) {
        console.log(`✅ useRouteProtection: Route "${route}" found in accessibleRoutes (normalized match) - TRUSTING and allowing access without backend call`);
        return {
          access: true,
          hasAccess: true,
          message: 'Access granted',
          status: 'ACCESS_GRANTED',
          status_code: 200,
          route,
        };
      }

      console.log(`⚠️ useRouteProtection: Route "${route}" NOT found in accessibleRoutes. Available routes:`, accessibleRoutes);
      console.log(`   Normalized check route: "${normalizedCheckRoute}", Normalized for comparison: "${normalizedRouteForComparison}"`);
    }

    // Check userRoutes for route access (from initial load) - allow if route is assigned
    if (userRoutes && userRoutes.routes && userRoutes.routes.length > 0) {
      const routeData = userRoutes.routes.find((r: BackendRoute) => {
        // Match exact path or normalized paths
        return routeMatches(r.path, route) || routeMatches(r.path || '', route);
      });

      if (routeData) {
        if (routeData.access) {
          // Route is in userRoutes and has access - allow without backend call
          const normalizedRoute = normalizeRoutePath(route);
          if (!accessibleRoutes.includes(normalizedRoute) && !accessibleRoutes.includes(route)) {
            setAccessibleRoutes(prev => [...prev, normalizedRoute]);
          }
          return {
            access: true,
            hasAccess: true,
            message: 'Access granted',
            permissions: routeData.permissions || [],
            status: 'ACCESS_GRANTED',
            status_code: 200,
            route,
          };
        } else {
          // Route is in userRoutes but access is false - deny immediately
          return {
            access: false,
            hasAccess: false,
            message: 'Access denied - Route not assigned to your role',
            reason: 'ACCESS_DENIED',
            status: 'ACCESS_DENIED',
            status_code: 403,
            route,
          };
        }
      }
    }

    // If not in cache, check with backend API
    const response = await routeProtectionService.checkRouteAccess(route);

    // Update accessible routes if access granted
    if (response.access) {
      const normalizedRoute = normalizeRoutePath(route);
      if (!accessibleRoutes.includes(normalizedRoute) && !accessibleRoutes.includes(route)) {
        setAccessibleRoutes(prev => [...prev, normalizedRoute]);
      }
    }

    return response;
  }, [isAuthenticated, accessibleRoutes, userRoutes, routeProtectionService, routeMatches, normalizeRoutePath]);

  /**
   * Check if route is accessible (synchronous, from cache)
   */
  const isRouteAccessible = useCallback((route: string): boolean => {
    if (!accessibleRoutes || accessibleRoutes.length === 0) return false;

    // Check exact match first
    if (accessibleRoutes.includes(route)) return true;

    // Check normalized paths
    const normalizedRoute = route === '/' ? route : route.replace(/\/+$/, '');
    return accessibleRoutes.some(accessibleRoute => {
      const normalizedAccessible = accessibleRoute === '/' ? accessibleRoute : accessibleRoute.replace(/\/+$/, '');
      return normalizedRoute === normalizedAccessible;
    });
  }, [accessibleRoutes]);

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback(async (permission: string): Promise<boolean> => {
    if (!userRoutes) {
      return false;
    }

    return userRoutes.routes.some((route: BackendRoute) =>
      route.permissions && route.permissions.includes(permission)
    );
  }, [userRoutes]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(async (permissions: string[]): Promise<boolean> => {
    if (!userRoutes) {
      return false;
    }

    return userRoutes.routes.some((route: BackendRoute) =>
      route.permissions && route.permissions.some((permission: string) =>
        permissions.includes(permission)
      )
    );
  }, [userRoutes]);

  /**
   * Check if route is restricted
   */
  const isRouteRestricted = useCallback((route: string): boolean => {
    if (!restrictedRoutes || restrictedRoutes.length === 0) return false;

    const normalizedRoute = route === '/' ? route : route.replace(/\/+$/, '');
    return restrictedRoutes.some(restrictedRoute => {
      const normalizedRestricted = restrictedRoute === '/' ? restrictedRoute : restrictedRoute.replace(/\/+$/, '');
      return normalizedRoute === normalizedRestricted;
    });
  }, [restrictedRoutes]);

  /**
   * Get permissions for a specific route
   */
  const getRoutePermissions = useCallback((route: string): string[] => {
    if (!userRoutes) {
      return [];
    }

    const routeData = userRoutes.routes.find((r: BackendRoute) => r.path === route);
    return routeData?.permissions || [];
  }, [userRoutes]);

  /**
   * Get restriction reason for a route
   */
  const getRestrictionReason = useCallback((route: string): string | null => {
    if (!userPaths?.user_paths?.restricted_paths_details) {
      return null;
    }

    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
    const restrictedDetail = userPaths.user_paths.restricted_paths_details.find(
      (detail) => detail.path === normalizedRoute || detail.path === route
    );

    return restrictedDetail?.reason || null;
  }, [userPaths]);

  /**
   * Refresh routes from backend and clear all caches
   */
  const refreshRoutes = useCallback(async () => {
    console.log('🔄 useRouteProtection: Refreshing routes and clearing caches...');
    // Clear service cache
    routeProtectionService.clearAllCaches();
    // Clear local state
    setAccessibleRoutes([]);
    setRestrictedRoutes([]);
    setUserRoutes(null);
    setUserPaths(null);
    setPathStatistics(null);
    setCurrentRouteAccess(null);
    // Reload routes from backend
    await loadRoutes(true);
    console.log('✅ useRouteProtection: Routes refreshed');
  }, [loadRoutes, routeProtectionService]);

  /**
   * Clear all caches without reloading
   */
  const clearAllCaches = useCallback(() => {
    console.log('🗑️ useRouteProtection: Clearing all caches...');
    routeProtectionService.clearAllCaches();
    setAccessibleRoutes([]);
    setRestrictedRoutes([]);
    setUserRoutes(null);
    setUserPaths(null);
    setPathStatistics(null);
    setCurrentRouteAccess(null);
    setIsInitialized(false);

    // Clear accessible routes cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'accessible_routes=; path=/; max-age=0; SameSite=Strict';
    }
    console.log('✅ useRouteProtection: All caches cleared');
  }, [routeProtectionService]);

  // Load routes on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadRoutes();
    } else {
      // Clear all caches and state when user logs out
      console.log('🗑️ useRouteProtection: User logged out, clearing all caches...');
      routeProtectionService.clearAllCaches();
      setIsLoading(false);
      setIsInitialized(false);
      setAccessibleRoutes([]);
      setRestrictedRoutes([]);
      setUserRoutes(null);
      setUserPaths(null);
      setPathStatistics(null);
      setCurrentRouteAccess(null);
      // Clear accessible routes cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'accessible_routes=; path=/; max-age=0; SameSite=Strict';
      }
    }
  }, [isAuthenticated, user, loadRoutes, routeProtectionService]);

  // Check current route access when pathname changes
  useEffect(() => {
    if (pathname && isAuthenticated && isInitialized) {
      checkRouteAccess(pathname).then(setCurrentRouteAccess);
    } else {
      setCurrentRouteAccess(null);
    }
  }, [pathname, isAuthenticated, isInitialized, checkRouteAccess]);

  return {
    // State
    isLoading,
    isInitialized,
    accessibleRoutes,
    restrictedRoutes,
    userRoutes,
    userPaths, // Expose userPaths for direct access to user_roles
    pathStatistics,

    // Route checking methods
    canAccessRoute,
    checkRouteAccess,
    isRouteAccessible,
    isRouteRestricted,

    // Permission methods
    hasPermission,
    hasAnyPermission,

    // Utility methods
    refreshRoutes,
    clearAllCaches,
    getRoutePermissions,
    getRestrictionReason,

    // Current route status
    currentRouteAccess,
  };
}

