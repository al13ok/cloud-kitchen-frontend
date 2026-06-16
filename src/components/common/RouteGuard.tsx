"use client";

import { useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useRouteProtection } from '@/hooks/useRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { RBAC_CONFIG } from '@/utils/config';

interface RouteGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  showLoader?: boolean;
  loader?: ReactNode;
}

/**
 * RouteGuard Component
 * Protects routes by checking access with backend API
 * Redirects unauthorized users to access-denied page
 */
export default function RouteGuard({
  children,
  fallback,
  redirectTo,
  showLoader = true,
  loader,
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    isLoading, 
    isInitialized, 
    accessibleRoutes,
    currentRouteAccess,
    checkRouteAccess,
  } = useRouteProtection();

  // Check if route is public - memoized to prevent recreating on every render
  const isPublicRoute = useCallback((path: string): boolean => {
    return RBAC_CONFIG.PUBLIC_ROUTES.some(route => 
      path === route || path.startsWith(route)
    );
  }, []);

  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // CRITICAL: Set access immediately for public routes on mount
  useEffect(() => {
    const currentPath = pathname || '';
    if (isPublicRoute(currentPath)) {
      setHasAccess(true);
      setIsChecking(false);
    }
  }, [pathname, isPublicRoute]);

  useEffect(() => {
    const verifyAccess = async () => {
      // CRITICAL: Check if route is public FIRST - before any auth checks
      // This ensures public routes like /survey/{id} are allowed immediately
      if (isPublicRoute(pathname || '')) {
        setHasAccess(true);
        setIsChecking(false);
        return; // Exit early - no need for any further checks
      }

      // Wait for auth to be determined (only for protected routes)
      if (authLoading) {
        return;
      }

      // If not authenticated, redirect to signin for protected routes
      if (!isAuthenticated) {
        // Redirect to signin for protected routes
        const redirect = redirectTo || RBAC_CONFIG.DEFAULT_REDIRECTS.UNAUTHORIZED;
        router.push(`${redirect}?from=${encodeURIComponent(pathname || '/')}`);
        return;
      }

      // Wait for route protection to initialize
      if (!isInitialized || isLoading) {
        return;
      }

      // Skip check for public routes
      if (isPublicRoute(pathname || '')) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      const currentPath = pathname || '';
      
      // Normalize path for comparison (remove trailing slashes, keep root as is)
      const normalizePath = (path: string): string => {
        if (!path) return '';
        return path === '/' ? path : path.replace(/\/+$/, '');
      };
      const normalizedCurrentPath = normalizePath(currentPath);

      // PRIORITY 1: TRUST accessibleRoutes ONLY if initialized
      // Routes in accessibleRoutes come from backend and are already assigned to user's role
      // Don't trust stale data from previous session
      if (isInitialized && accessibleRoutes && accessibleRoutes.length > 0) {
        // Ensure currentPath has leading slash to match backend format
        const normalizedCheckPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;
        
        // Check exact match first
        if (accessibleRoutes.includes(currentPath) || accessibleRoutes.includes(normalizedCheckPath)) {
          console.log(`✅ RouteGuard: Route "${currentPath}" found in accessibleRoutes - allowing access`);
          setHasAccess(true);
          setIsChecking(false);
          return;
        }
        
        // Check normalized paths (handle trailing slashes, path variations)
        const isAccessible = accessibleRoutes.some((route: string) => {
          const normalizedRoute = normalizePath(route);
          const normalizedCurrent = normalizePath(normalizedCheckPath);
          
          // Exact normalized match
          if (normalizedRoute === normalizedCurrent) {
            return true;
          }
          
          // Check with/without leading slash variations
          const routeWithoutSlash = route.startsWith('/') ? route.slice(1) : route;
          const currentWithoutSlash = normalizedCheckPath.startsWith('/') ? normalizedCheckPath.slice(1) : normalizedCheckPath;
          if (routeWithoutSlash === currentWithoutSlash) {
            return true;
          }
          
          // Check wildcard routes (e.g., /customer/* matches /customer/123)
          if (route.includes('/*')) {
            const baseRoute = route.replace('/*', '');
            const normalizedBase = normalizePath(baseRoute);
            return normalizedCurrent.startsWith(normalizedBase + '/') || normalizedCurrent === normalizedBase;
          }
          
          return false;
        });
        
        if (isAccessible) {
          console.log(`✅ RouteGuard: Route "${currentPath}" found in accessibleRoutes - allowing access`);
          setHasAccess(true);
          setIsChecking(false);
          return;
        }
      }

      // PRIORITY 2: Check currentRouteAccess (from hook's cache)
      if (currentRouteAccess && currentRouteAccess.access === true) {
        console.log(`✅ RouteGuard: Route ${currentPath} access granted from currentRouteAccess`);
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // PRIORITY 3: Check with backend API (only if not in accessibleRoutes)
      try {
        setIsChecking(true);
        
        const accessResponse = await checkRouteAccess(currentPath);

        // Allow if access is granted
        if (accessResponse.access === true) {
          console.log(`✅ RouteGuard: Route ${currentPath} access granted from backend`);
          setHasAccess(true);
          setIsChecking(false);
          return;
        }

        // Access denied from backend
        console.warn(`❌ RouteGuard: Route ${currentPath} access denied - ${accessResponse.reason || 'UNKNOWN'}`);
        setHasAccess(false);
        setIsChecking(false);
        
        const deniedRedirect = redirectTo || '/access-denied';
        const message = accessResponse.message || 
                       (accessResponse.reason === 'ROUTE_NOT_FOUND' 
                         ? `Route not found or not assigned to your role: ${currentPath}`
                         : accessResponse.reason === 'ACCESS_DENIED'
                         ? `Access denied: ${currentPath} is not assigned to your role`
                         : 'Access denied');
        
        router.push(
          `${deniedRedirect}?route=${encodeURIComponent(currentPath)}&message=${encodeURIComponent(message)}`
        );
        return;

      } catch (error) {
        console.error(`❌ RouteGuard: Route ${currentPath} check error:`, error);
        
        // FALLBACK: If backend check fails and route is in accessibleRoutes, allow
        // But only if initialized (don't trust stale data)
        if (isInitialized && accessibleRoutes?.length > 0) {
          const isAccessible = accessibleRoutes.some((route: string) => {
            const normalizedRoute = normalizePath(route);
            return normalizedRoute === normalizedCurrentPath || route === currentPath;
          });
          
          if (isAccessible) {
            console.log(`✅ RouteGuard: Route ${currentPath} found in accessibleRoutes after error - allowing access`);
            setHasAccess(true);
            setIsChecking(false);
            return;
          }
        }
        
        // If not accessible, deny
        setHasAccess(false);
        setIsChecking(false);
        
        router.push(
          `/access-denied?route=${encodeURIComponent(currentPath)}&message=${encodeURIComponent('Failed to verify route access. Access denied.')}`
        );
      }
    };

    verifyAccess();
  }, [
    pathname,
    isAuthenticated,
    authLoading,
    isInitialized, // CRITICAL: Wait for initialization
    isLoading, // CRITICAL: Wait for loading to complete
    accessibleRoutes,
    currentRouteAccess,
    checkRouteAccess,
    router,
    redirectTo,
    isPublicRoute, // Include memoized function in dependencies
  ]);

  // CRITICAL: Skip loading for public routes - allow immediate access
  const isCurrentRoutePublic = isPublicRoute(pathname || '');
  
  // Show loader while checking (but skip for public routes)
  if (!isCurrentRoutePublic && (authLoading || isLoading || isChecking || !isInitialized)) {
    if (!showLoader) {
      return null;
    }
    
    return loader || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show fallback if access denied (before redirect)
  if (hasAccess === false) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Render children if access granted
  if (hasAccess === true || isPublicRoute(pathname || '')) {
    return <>{children}</>;
  }

  // Default: show loader
  return showLoader ? (loader || (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )) : null;
}

/**
 * Higher-Order Component for route protection
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<RouteGuardProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <RouteGuard {...options}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}

