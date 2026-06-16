import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
const PUBLIC_ROUTES = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/access-denied',
  '/survey',
];

/**
 * Check route access using backend API - STRICT MODE
 * Returns true ONLY if backend explicitly grants access
 * Returns false for 404, 403, 401, or any error
 */
async function checkRouteAccessBackend(pathname: string, accessToken: string): Promise<{ hasAccess: boolean; reason?: string; status?: number }> {
  try {
    if (!API_URL) {
      console.error('API_URL not configured in middleware - STRICT: denying access');
      return { hasAccess: false, reason: 'API_URL_NOT_CONFIGURED' };
    }

    // Normalize pathname: remove leading slash to avoid double slashes in URL
    const normalizedPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    
    const response = await fetch(`${API_URL}/api/v1/frontend-routes/routes/check/${encodeURIComponent(normalizedPath)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      // Add timeout for middleware (increased to 10 seconds for slow backends)
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      // STRICT: Only allow if backend explicitly says access: true
      if (data.access === true) {
        return { hasAccess: true, status: 200 };
      } else {
        return { hasAccess: false, reason: 'ACCESS_DENIED', status: 200 };
      }
    } else if (response.status === 404) {
      // STRICT: Route not found = deny access
      console.error(`Route not found (404) for ${pathname} - STRICT: denying access`);
      return { hasAccess: false, reason: 'ROUTE_NOT_FOUND', status: 404 };
    } else if (response.status === 403) {
      // STRICT: Access denied
      console.error(`Access denied (403) for ${pathname} - STRICT: denying access`);
      return { hasAccess: false, reason: 'ACCESS_DENIED', status: 403 };
    } else if (response.status === 401) {
      // STRICT: Unauthenticated = deny access
      console.error(`Unauthorized (401) for ${pathname} - STRICT: denying access`);
      return { hasAccess: false, reason: 'UNAUTHENTICATED', status: 401 };
    }

    // STRICT: Any other error = deny access
    console.error(`Route access check failed for ${pathname}: ${response.status} - STRICT: denying access`);
    return { hasAccess: false, reason: 'CHECK_FAILED', status: response.status };
  } catch (error) {
    // Handle timeout errors more gracefully
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('timeout') || error.message.includes('aborted')) {
        console.error(`Route access check TIMEOUT for ${pathname} - Backend taking too long. Denying access for security.`);
        return { hasAccess: false, reason: 'TIMEOUT_ERROR', status: 408 };
      }
      if (error.name === 'AbortError') {
        console.error(`Route access check ABORTED for ${pathname} - Request cancelled. Denying access.`);
        return { hasAccess: false, reason: 'ABORT_ERROR', status: 0 };
      }
    }
    // STRICT: Network/error = deny access
    console.error(`Route access check error for ${pathname}:`, error, '- STRICT: denying access');
    return { hasAccess: false, reason: 'NETWORK_ERROR' };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Early return for Next.js internal endpoints to prevent loops
  // This MUST be the first check to avoid any processing overhead
  if (
    pathname.startsWith('/__nextjs_') || 
    pathname.startsWith('/_next/') ||
    pathname.includes('__nextjs_original-stack-frames')
  ) {
    return NextResponse.next();
  }

  // Early return for static files from public folder (JS, CSS, images, fonts, etc.)
  // This prevents middleware from processing static assets
  if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|json)$/)) {
    return NextResponse.next();
  }

  // Early return for survey routes - always allow public access without authentication
  if (pathname.startsWith('/survey')) {
    // Debug logging (can be removed after verification)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Middleware: Survey route detected, allowing public access:', pathname);
    }
    return NextResponse.next();
  }
  
  // Check authentication status
  const hasAuthCookie = request.cookies.get('isAuthenticated')?.value === 'true';
  const hasAuthHeader = request.headers.get('Authorization')?.startsWith('Bearer ');
  const hasAccessToken = !!request.cookies.get('access_token')?.value;
  const hasRefreshToken = !!request.cookies.get('refresh_token')?.value;
  
  const isAuthenticated = hasAuthCookie || hasAuthHeader || hasAccessToken || hasRefreshToken;
  

  
  const isAuthPage = pathname.startsWith('/signin') || 
                    pathname.startsWith('/signup') ||
                    pathname.startsWith('/forgot-password') ||
                    pathname.startsWith('/reset-password');
  
  const isPublicRoute = pathname.startsWith('/api/') ||
                       pathname.startsWith('/_next/') ||
                       pathname.startsWith('/__nextjs_') ||
                       pathname.startsWith('/favicon.ico') ||
                       pathname.startsWith('/access-denied') ||
                       pathname.startsWith('/public/') ||
                       pathname.startsWith('/images/') ||
                       pathname.startsWith('/assets/') ||
                       pathname.startsWith('/demo') ||
                       pathname.startsWith('/chatbot-new.bundle.js') ||
                       pathname.startsWith('/survey') || // Explicit check for survey routes (public access)
                       PUBLIC_ROUTES.some(route => pathname.startsWith(route)) ||
                       // Allow all static files from public folder (JS, CSS, images, etc.)
                       pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);

  // If user is not authenticated and trying to access protected routes
  if (!isAuthenticated && !isAuthPage && !isPublicRoute) {
    // TEMPORARY: Allow access to helpdesk-create-ticket for development
    if (pathname === '/helpdesk-create-ticket') {
      return NextResponse.next();
    }
    const url = new URL('/signin', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // If user is not authenticated and visits root path, redirect to signin
  if (!isAuthenticated && pathname === '/') {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // If user is authenticated and trying to access auth pages, redirect to home page
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If authenticated user visits root path, allow access to home page
  if (isAuthenticated && pathname === '/') {
    return NextResponse.next();
  }

  // Check route access for authenticated users on protected routes using backend API
  if (isAuthenticated && !isAuthPage && !isPublicRoute) {
    // Get access token from cookies
    const accessToken = request.cookies.get('access_token')?.value;
    
    if (!accessToken) {
      // No token, redirect to signin
      const url = new URL('/signin', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    // BYPASS: Allow /previous-chat for authenticated users (chat view accessible from inbox)
    // This route is used to view chat history and should be accessible to authenticated users
    if (pathname === '/previous-chat' || pathname.startsWith('/previous-chat')) {
      // Allow access for authenticated users - this is a chat view that should be accessible
      return NextResponse.next();
    }

    // BYPASS: Allow integration pages for authenticated users (integration management pages)
    if (pathname === '/telegram-integration' || 
        pathname.startsWith('/telegram-integration') ||
        pathname === '/Instagram-Integration' ||
        pathname.startsWith('/Instagram-Integration') ||
        pathname === '/WhatsApp-Integration' ||
        pathname.startsWith('/WhatsApp-Integration')) {
      // Allow access for authenticated users - these are integration management pages
      return NextResponse.next();
    }

    // FAST CHECK: Check if route is in accessible routes cookie (avoid backend call)
    const accessibleRoutesCookie = request.cookies.get('accessible_routes')?.value;
    if (accessibleRoutesCookie) {
      try {
        const accessibleRoutes: string[] = JSON.parse(accessibleRoutesCookie);
        const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
        const normalizedPathNoSlash = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        
        // Check if route is in accessible routes (handle both with/without leading slash)
        if (accessibleRoutes.includes(pathname) || 
            accessibleRoutes.includes(normalizedPath) ||
            accessibleRoutes.includes(normalizedPathNoSlash)) {
          // Route is in accessible routes cookie - allow immediately without backend call
          return NextResponse.next();
        }
      } catch (error) {
        // Cookie parse error - continue to backend check
        console.warn('Failed to parse accessible_routes cookie:', error);
      }
    }

    // Check route access with backend API - STRICT MODE (only if not in cookie)
    try {
      const accessResult = await checkRouteAccessBackend(pathname, accessToken);
      
      // STRICT: Only allow if backend explicitly grants access
      if (!accessResult.hasAccess) {
        const url = new URL('/access-denied', request.url);
        url.searchParams.set('route', pathname);
        
        let message = 'You do not have permission to access this page';
        if (accessResult.reason === 'ROUTE_NOT_FOUND') {
          message = `Route not found or not assigned to your role: ${pathname}`;
        } else if (accessResult.reason === 'ACCESS_DENIED') {
          message = `Access denied: You do not have permission to access ${pathname}`;
        } else if (accessResult.reason === 'UNAUTHENTICATED') {
          message = 'Authentication required';
        } else if (accessResult.reason === 'NETWORK_ERROR') {
          message = 'Failed to verify route access. Please try again.';
        } else if (accessResult.reason === 'TIMEOUT_ERROR') {
          message = 'Route access verification timed out. Please try again or contact support.';
        } else if (accessResult.reason === 'ABORT_ERROR') {
          message = 'Route access verification was cancelled. Please try again.';
        }
        
        url.searchParams.set('message', message);
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // STRICT: On error, deny access
      console.error('Middleware route check error:', error);
      const url = new URL('/access-denied', request.url);
      url.searchParams.set('route', pathname);
      url.searchParams.set('message', 'Failed to verify route access. Access denied.');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - __nextjs_ (Next.js internal endpoints like __nextjs_original-stack-frames)
     * - favicon.ico (favicon file)
     * Note: Static files from public folder are handled in middleware logic
     */
    '/((?!api|_next/static|_next/image|__nextjs_|favicon\\.ico).*)',
  ],
} 