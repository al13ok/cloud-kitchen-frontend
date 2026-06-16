import AuthService from './AuthService';
import RouteGuard from './RouteGuard';
import { RBAC_CONFIG } from '@/utils/config';

export interface NavigationItem {
  id: string;
  name: string;
  path: string;
  icon?: string;
  type: 'link' | 'section' | 'submenu';
  children?: NavigationItem[];
  permissions?: string[];
  roles?: string[];
  badge?: {
    text: string;
    color: string;
  };
  isActive?: boolean;
}

export interface NavigationSection {
  id: string;
  name: string;
  icon?: string;
  items: NavigationItem[];
  permissions?: string[];
  roles?: string[];
}

export interface NavigationConfig {
  sections: NavigationSection[];
  defaultSection?: string;
}

class NavigationService {
  private static instance: NavigationService;
  private authService: AuthService;
  private routeGuard: RouteGuard;
  private navigationConfig: NavigationConfig = { sections: [] };
  private cachedNavigation: NavigationSection[] = [];
  private cacheTimestamp: number = 0;

  private constructor() {
    this.authService = AuthService.getInstance();
    this.routeGuard = RouteGuard.getInstance();
  }

  public static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  public async initialize(): Promise<void> {
    // Check if user is authenticated before making API calls
    if (!this.authService.isAuthenticated() || !this.authService.getToken()) {
      this.setupBasicNavigation();
      return;
    }

    // Try to fetch navigation config from backend if enabled
    if (RBAC_CONFIG.FEATURES.ENABLE_FALLBACK_CONFIG) {
      try {
        const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.NAVIGATION_CONFIG}`, {
          headers: {
            'Authorization': `Bearer ${this.authService.getToken()}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          this.navigationConfig = data;
          return;
        }
      } catch {
        console.log('NavigationService: Failed to fetch navigation config, using fallback');
      }
    }

    // Use fallback navigation if API call fails or is disabled
    console.log('NavigationService: Using fallback navigation configuration');
    this.setupBasicNavigation();
  }

  private setupBasicNavigation(): void {
    this.navigationConfig = {
      sections: [
        {
          id: 'dashboard',
          name: 'Dashboard',
          icon: 'DashboardIcon',
          items: [
            {
              id: 'main-dashboard',
              name: 'Dashboard',
              path: '/dashboard',
              type: 'link',
              icon: 'DashboardIcon',
            },
          ],
        },
        {
          id: 'hr',
          name: 'HR Management',
          icon: 'UsersIcon',
          roles: ['1', '2'],
          items: [
            {
              id: 'candidates',
              name: 'Candidates',
              path: '/hr/candidates',
              type: 'link',
              icon: 'UserIcon',
            },
            {
              id: 'employees',
              name: 'Employees',
              path: '/employee',
              type: 'link',
              icon: 'UsersIcon',
            },
            {
              id: 'jobs',
              name: 'Jobs',
              path: '/Jobs',
              type: 'link',
              icon: 'BriefcaseIcon',
            },
          ],
        },
        {
          id: 'sales',
          name: 'Sales & CRM',
          icon: 'TrendingUpIcon',
          roles: ['1', '3'],
          items: [
            {
              id: 'leads',
              name: 'Leads',
              path: '/sales/leads',
              type: 'link',
              icon: 'TargetIcon',
            },
            {
              id: 'customers',
              name: 'Customers',
              path: '/customer',
              type: 'link',
              icon: 'UserIcon',
            },
            {
              id: 'crm-settings',
              name: 'CRM Settings',
              path: '/crm-settings',
              type: 'link',
              icon: 'SettingsIcon',
            },
          ],
        },
        {
          id: 'support',
          name: 'Support',
          icon: 'HeadphonesIcon',
          roles: ['1', '4'],
          items: [
            {
              id: 'tickets',
              name: 'Tickets',
              path: '/support/tickets',
              type: 'link',
              icon: 'TicketIcon',
            },
            {
              id: 'helpdesk-settings',
              name: 'Helpdesk Settings',
              path: '/helpdesk-settings',
              type: 'link',
              icon: 'SettingsIcon',
            },
          ],
        },
        {
          id: 'it',
          name: 'IT Management',
          icon: 'ServerIcon',
          roles: ['1', '5'],
          items: [
            {
              id: 'logs',
              name: 'System Logs',
              path: '/it/logs',
              type: 'link',
              icon: 'FileTextIcon',
            },
            {
              id: 'system-status',
              name: 'System Status',
              path: '/controls-system-status',
              type: 'link',
              icon: 'ActivityIcon',
            },
          ],
        },
        {
          id: 'admin',
          name: 'Administration',
          icon: 'ShieldIcon',
          roles: ['1'],
          items: [
            {
              id: 'users',
              name: 'User Management',
              path: '/controls-users',
              type: 'link',
              icon: 'UsersIcon',
            },
            {
              id: 'storage',
              name: 'Storage',
              path: '/controls-storage',
              type: 'link',
              icon: 'HardDriveIcon',
            },
            {
              id: 'integrations',
              name: 'Integrations',
              path: '/integration-center-connectors',
              type: 'link',
              icon: 'PlugIcon',
            },
          ],
        },
      ],
    };
  }

  public async getNavigation(): Promise<NavigationSection[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return [];

    // Check if we have cached navigation for this user and caching is enabled
    if (this.cachedNavigation.length > 0 && this.shouldUseCache()) {
      const now = Date.now();
      if (now - this.cacheTimestamp < this.getCacheTTL()) {
        return this.cachedNavigation;
      }
    }

    const accessibleSections: NavigationSection[] = [];

    for (const section of this.navigationConfig.sections) {
      // Check if user has access to this section
      if (await this.canAccessSection(section)) {
        const accessibleItems = await this.filterAccessibleItems(section.items);
        
        if (accessibleItems.length > 0) {
          accessibleSections.push({
            ...section,
            items: accessibleItems,
          });
        }
      }
    }

    // Cache the navigation if caching is enabled
    if (this.shouldUseCache()) {
      this.cachedNavigation = accessibleSections;
      this.cacheTimestamp = Date.now();
    }
    return accessibleSections;
  }

  private async canAccessSection(section: NavigationSection): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    // Check role-based access
    if (section.roles && section.roles.length > 0) {
      if (!section.roles.includes(user.role_id)) {
        return false;
      }
    }

    // Check permission-based access
    if (section.permissions && section.permissions.length > 0) {
      const hasAllPermissions = section.permissions.every(permission => {
        const [resource, action] = permission.split(':');
        return this.authService.hasPermission(resource, action);
      });

      if (!hasAllPermissions) {
        return false;
      }
    }

    return true;
  }

  private async filterAccessibleItems(items: NavigationItem[]): Promise<NavigationItem[]> {
    const accessibleItems: NavigationItem[] = [];

    for (const item of items) {
      if (await this.canAccessItem(item)) {
        // Recursively filter children if they exist
        if (item.children && item.children.length > 0) {
          const accessibleChildren = await this.filterAccessibleItems(item.children);
          if (accessibleChildren.length > 0) {
            accessibleItems.push({
              ...item,
              children: accessibleChildren,
            });
          }
        } else {
          accessibleItems.push(item);
        }
      }
    }

    return accessibleItems;
  }

  private async canAccessItem(item: NavigationItem): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    // Check role-based access
    if (item.roles && item.roles.length > 0) {
      if (!item.roles.includes(user.role_id)) {
        return false;
      }
    }

    // Check permission-based access
    if (item.permissions && item.permissions.length > 0) {
      const hasAllPermissions = item.permissions.every(permission => {
        const [resource, action] = permission.split(':');
        return this.authService.hasPermission(resource, action);
      });

      if (!hasAllPermissions) {
        return false;
      }
    }

    // Check route access
    if (item.path) {
      const { allowed } = this.routeGuard.canAccessRoute(item.path);
      return allowed;
    }

    return true;
  }

  public async getBreadcrumbs(path: string): Promise<NavigationItem[]> {
    const navigation = await this.getNavigation();
    const breadcrumbs: NavigationItem[] = [];

    const findPathInItems = (items: NavigationItem[], targetPath: string): NavigationItem[] => {
      for (const item of items) {
        if (item.path === targetPath) {
          return [item];
        }
        if (item.children) {
          const result = findPathInItems(item.children, targetPath);
          if (result.length > 0) {
            return [item, ...result];
          }
        }
      }
      return [];
    };

    for (const section of navigation) {
      const result = findPathInItems(section.items, path);
      if (result.length > 0) {
        breadcrumbs.push(
          { id: section.id, name: section.name, path: '', type: 'section' },
          ...result
        );
        break;
      }
    }

    return breadcrumbs;
  }

  public async getQuickActions(): Promise<NavigationItem[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return [];

    // Try to fetch quick actions from backend if enabled
    if (RBAC_CONFIG.FEATURES.ENABLE_FALLBACK_CONFIG) {
      try {
        const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.QUICK_ACTIONS}`, {
          headers: {
            'Authorization': `Bearer ${this.authService.getToken()}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch {
        console.log('NavigationService: Failed to fetch quick actions, using fallback');
      }
    }

    // Use fallback quick actions based on role
    console.log('NavigationService: Using fallback quick actions configuration');
    const roleQuickActions: Record<string, NavigationItem[]> = {
      '1': [ // Super Admin
        { id: 'add-user', name: 'Add User', path: '/controls-users', type: 'link', icon: 'UserPlusIcon' },
        { id: 'system-status', name: 'System Status', path: '/controls-system-status', type: 'link', icon: 'ActivityIcon' },
      ],
      '2': [ // HR
        { id: 'add-candidate', name: 'Add Candidate', path: '/hr/candidates', type: 'link', icon: 'UserPlusIcon' },
        { id: 'post-job', name: 'Post Job', path: '/Jobs', type: 'link', icon: 'BriefcaseIcon' },
      ],
      '3': [ // Sales
        { id: 'add-lead', name: 'Add Lead', path: '/sales/leads', type: 'link', icon: 'TargetIcon' },
        { id: 'add-customer', name: 'Add Customer', path: '/customer', type: 'link', icon: 'UserPlusIcon' },
      ],
      '4': [ // Support
        { id: 'create-ticket', name: 'Create Ticket', path: '/support/tickets', type: 'link', icon: 'TicketIcon' },
        { id: 'view-tickets', name: 'View Tickets', path: '/support/tickets', type: 'link', icon: 'ListIcon' },
      ],
      '5': [ // IT
        { id: 'system-logs', name: 'System Logs', path: '/it/logs', type: 'link', icon: 'FileTextIcon' },
        { id: 'system-status', name: 'System Status', path: '/controls-system-status', type: 'link', icon: 'ActivityIcon' },
      ],
    };

    return roleQuickActions[user.role_id] || [];
  }

  public clearCache(): void {
    this.cachedNavigation = [];
    this.cacheTimestamp = 0;
  }

  private shouldUseCache(): boolean {
    return RBAC_CONFIG.FEATURES.ENABLE_ROUTE_CACHING;
  }

  private getCacheTTL(): number {
    return RBAC_CONFIG.CACHE.NAVIGATION_TTL;
  }

  public async refreshNavigation(): Promise<void> {
    this.clearCache();
    await this.initialize();
  }

  public getSectionById(sectionId: string): NavigationSection | undefined {
    return this.navigationConfig.sections.find(section => section.id === sectionId);
  }

  public async getItemByPath(path: string): Promise<NavigationItem | undefined> {
    const navigation = await this.getNavigation();
    
    const findItem = (items: NavigationItem[]): NavigationItem | undefined => {
      for (const item of items) {
        if (item.path === path) {
          return item;
        }
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    for (const section of navigation) {
      const item = findItem(section.items);
      if (item) return item;
    }

    return undefined;
  }
}

export default NavigationService; 