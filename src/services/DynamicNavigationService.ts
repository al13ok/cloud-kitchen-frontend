/**
 * Dynamic Navigation Service
 * Fetches and manages navigation based on user roles and permissions from backend
 */

import { getAuthHeaders } from '../utils/api';
import { RBAC_CONFIG } from '../utils/config';
import { 
  NavigationItem, 
  NavigationSection, 
  UserRouteInfo, 
  BackendRoute, 
  SystemStatus, 
  RouteAccessResponse 
} from '@/types/rbac';

class DynamicNavigationService {
  private static instance: DynamicNavigationService;
  private userRoutes: UserRouteInfo | null = null;
  private navigationCache: NavigationSection[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): DynamicNavigationService {
    if (!DynamicNavigationService.instance) {
      DynamicNavigationService.instance = new DynamicNavigationService();
    }
    return DynamicNavigationService.instance;
  }

  /**
   * Fetch user routes and permissions from backend
   */
  public async fetchUserRoutes(): Promise<UserRouteInfo> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.USER_ROUTES}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user routes: ${response.status}`);
      }

      const data = await response.json();
      this.userRoutes = data;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      return data;
    } catch (error) {
      console.error('Error fetching user routes:', error);
      throw error;
    }
  }

  /**
   * Get cached user routes or fetch if expired
   */
  public async getUserRoutes(): Promise<UserRouteInfo> {
    if (this.userRoutes && Date.now() < this.cacheExpiry) {
      return this.userRoutes;
    }
    return await this.fetchUserRoutes();
  }

  /**
   * Check if user has access to a specific route
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
        throw new Error(`Failed to check route access: ${response.status}`);
      }

      return await response.json() as RouteAccessResponse;
    } catch (error) {
      console.error('Error checking route access:', error);
      const errorResponse: RouteAccessResponse = {
        hasAccess: false,
        access: false,
        message: 'Error checking route access',
        reason: 'ERROR',
        permissions: [],
        user_roles: [],
        route
      };
      return errorResponse;
    }
  }

  /**
   * Check system initialization and auto-initialize if needed
   */
  public async ensureSystemInitialized(): Promise<void> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/frontend-routes/system-status`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.system_status.is_initialized) {
          console.log('System not initialized, triggering auto-initialization...');
          await this.initializeSystem();
        }
      }
    } catch (error) {
      console.warn('Could not check system status:', error);
    }
  }

  /**
   * Initialize system with default routes
   */
  public async initializeSystem(): Promise<void> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/frontend-routes/system/initialize`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('System initialized:', data.message);
      }
    } catch (error) {
      console.error('Failed to initialize system:', error);
    }
  }

  /**
   * Generate dynamic navigation based on user routes from backend
   */
  public async generateNavigation(): Promise<NavigationSection[]> {
    try {
      // Ensure system is initialized
      await this.ensureSystemInitialized();
      
      const userRoutes = await this.getUserRoutes();
      
      if (!userRoutes || !userRoutes.routes) {
        return this.getDefaultNavigation();
      }

      // Group routes by category/section
      const navigationSections: NavigationSection[] = [];
      const routeMap = new Map<string, NavigationItem[]>();

      // Define route categories based on backend route descriptions
      const routeCategories = {
        'Dashboard': ['/dashboard', '/leads-dashboard', '/applicants-dashboard', '/chat-dashboard', '/helpdesk-dashboard'],
        'Knowledge Hub': ['/customer', '/employee', '/organisation'],
        'CRM': ['/crm-leads', '/crm-settings'],
        'Helpdesk': ['/helpdesk-customer-ticket', '/helpdesk-employee-ticket', '/helpdesk-settings'],
        'Recruitment': ['/Jobs', '/job-listings', '/Job-Setting'],
        'Integration': ['/integration-center-connectors', '/WhatsApp-Integration', '/llm-model', '/avatars'],
        'Controls': ['/controls-system-status', '/controls-dashboard-settings', '/controls-users'],
        'Communication': ['/inbox', '/Email-Setting'],
        'System': ['/pre-prompt', '/Help', '/Version', '/Billing'],
        'Knowledge Management': ['/knowledge-hub']
      };

      // Process user's accessible routes
      userRoutes.routes.forEach((route: BackendRoute | string) => {
        const routeObj = typeof route === 'string' ? { path: route, access: true } : route;
        if (!routeObj.access) return;

        // Find which category this route belongs to
        let category = 'General';
        for (const [catName, paths] of Object.entries(routeCategories)) {
          if (paths.some((path: string) => routeObj.path.startsWith(path))) {
            category = catName;
            break;
          }
        }

        // Create navigation item using backend route_name
        const navItem: NavigationItem = {
          name: this.formatRouteName(routeObj.route || routeObj.path), // Use route name from backend
          path: routeObj.path,
          type: 'link',
          permissions: routeObj.permissions,
          description: routeObj.route || routeObj.path
        };

        // Add to category
        if (!routeMap.has(category)) {
          routeMap.set(category, []);
        }
        routeMap.get(category)!.push(navItem);
      });

      // Convert to navigation sections
      for (const [sectionName, items] of routeMap.entries()) {
        if (items.length > 0) {
          navigationSections.push({
            section: sectionName,
            type: 'section',
            icon: this.getSectionIcon(sectionName),
            items: items.sort((a, b) => a.name.localeCompare(b.name))
          });
        }
      }

      // Add home page as first item if user has access
      const hasHome = userRoutes.routes.some((route: BackendRoute | string) => {
        const routeObj = typeof route === 'string' ? { path: route, access: true } : route;
        return routeObj.path === '/' && routeObj.access;
      });
      if (hasHome) {
        navigationSections.unshift({
          section: 'Home',
          type: 'section',
          icon: 'HomeIcon',
          items: [{
            name: 'Home',
            path: '/',
            type: 'link',
            permissions: ['view'],
            description: 'Home page'
          }]
        });
      }

      this.navigationCache = navigationSections;
      return navigationSections;

    } catch (error) {
      console.error('Error generating navigation:', error);
      return this.getDefaultNavigation();
    }
  }

  /**
   * Get cached navigation or generate new
   */
  public async getNavigation(): Promise<NavigationSection[]> {
    if (this.navigationCache && Date.now() < this.cacheExpiry) {
      return this.navigationCache;
    }
    return await this.generateNavigation();
  }

  /**
   * Check if user has specific permission
   */
  public async hasPermission(permission: string): Promise<boolean> {
    try {
      const userRoutes = await this.getUserRoutes();
      return userRoutes.routes.some((route: BackendRoute | string) => {
        const routeObj = typeof route === 'string' ? { path: route, permissions: [] as string[] } : route;
        return routeObj.permissions && routeObj.permissions.includes(permission);
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified roles
   */
  public async hasAnyRole(roles: string[]): Promise<boolean> {
    try {
      const userRoutes = await this.getUserRoutes();
      return (userRoutes.roles || []).some((role: string) => roles.includes(role));
    } catch (error) {
      console.error('Error checking roles:', error);
      return false;
    }
  }

  /**
   * Get user's accessible routes as simple array
   */
  public async getAccessibleRoutes(): Promise<string[]> {
    try {
      const userRoutes = await this.getUserRoutes();
      return userRoutes.routes
        .filter((route: BackendRoute | string) => {
          const routeObj = typeof route === 'string' ? { path: route, access: true } : route;
          return routeObj.access;
        })
        .map((route: BackendRoute | string) => {
          const routeObj = typeof route === 'string' ? { path: route } : route;
          return routeObj.path;
        });
    } catch (error) {
      console.error('Error getting accessible routes:', error);
      return [];
    }
  }

  /**
   * Get all available routes for admin management
   */
  public async getAllRoutes(): Promise<BackendRoute[]> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/frontend-routes/routes`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch routes: ${response.status}`);
      }

      const data = await response.json();
      return data.routes || [];
    } catch (error) {
      console.error('Error fetching all routes:', error);
      return [];
    }
  }

  /**
   * Get routes assigned to a specific role
   */
  public async getRoutesForRole(roleName: string): Promise<BackendRoute[]> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/frontend-routes/routes/for-role/${encodeURIComponent(roleName)}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch routes for role: ${response.status}`);
      }

      const data = await response.json();
      return data.routes || [];
    } catch (error) {
      console.error('Error fetching routes for role:', error);
      return [];
    }
  }

  /**
   * Get system status
   */
  public async getSystemStatus(): Promise<SystemStatus> {
    try {
      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}/api/v1/frontend-routes/system-status`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch system status: ${response.status}`);
      }

      const data = await response.json();
      return data.system_status || { is_initialized: false, routes_count: 0, mappings_count: 0 };
    } catch (error) {
      console.error('Error fetching system status:', error);
      return { is_initialized: false, routes_count: 0, mappings_count: 0 };
    }
  }

  /**
   * Clear cache and force refresh
   */
  public clearCache(): void {
    this.userRoutes = null;
    this.navigationCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Format route name for display
   */
  private formatRouteName(routeName: string): string {
    return routeName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get icon for navigation section
   */
  private getSectionIcon(sectionName: string): string {
    const iconMap: Record<string, string> = {
      'Dashboard': 'HomeIcon',
      'Knowledge Hub': 'UsersIcon',
      'CRM': 'ChartBarIcon',
      'Helpdesk': 'SupportIcon',
      'Recruitment': 'BriefcaseIcon',
      'Integration': 'PuzzlePieceIcon',
      'Controls': 'CogIcon',
      'Communication': 'ChatIcon',
      'System': 'WrenchScrewdriverIcon',
      'General': 'DocumentIcon'
    };
    return iconMap[sectionName] || 'DocumentIcon';
  }

  /**
   * Get default navigation when backend is unavailable
   */
  private getDefaultNavigation(): NavigationSection[] {
    return [
      {
        section: 'Dashboard',
        type: 'section',
        icon: 'HomeIcon',
        items: [
          {
            name: 'Dashboard',
            path: '/',
            type: 'link',
            permissions: ['view'],
            description: 'Main dashboard'
          }
        ]
      }
    ];
  }
}

export default DynamicNavigationService;
