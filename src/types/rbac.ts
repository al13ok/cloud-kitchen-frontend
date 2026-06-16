/**
 * RBAC (Role-Based Access Control) Type Definitions
 * Types for navigation, routes, and access control
 */

// Navigation Types
export interface NavigationItem {
  name: string;
  path: string;
  type: 'link' | 'section' | 'submenu';
  icon?: string;
  permissions?: string[];
  roles?: string[];
  description?: string;
  children?: NavigationItem[];
  badge?: {
    text: string;
    color: string;
  };
  isActive?: boolean;
}

export interface NavigationSection {
  section?: string;
  name?: string;
  id?: string;
  type: 'section';
  icon?: string;
  items: NavigationItem[];
  permissions?: string[];
  roles?: string[];
}

// Route Types
export interface BackendRoute {
  route?: string;
  path: string;
  access: boolean;
  permissions?: string[];
  roles?: string[];
  description?: string;
}

export interface UserRouteInfo {
  user_id?: string;
  email?: string;
  full_name?: string;
  roles: string[];
  routes: (BackendRoute | string)[];
}

// Route Access Response
export interface RouteAccessResponse {
  hasAccess?: boolean;
  access: boolean;
  message: string;
  reason?: string;
  permissions?: string[];
  user_roles?: string[];
  required_roles?: string[];
  route?: string;
  status?: string;
  status_code?: number;
}

// User Routes Response
export interface UserRoutesResponse {
  user_id?: string;
  email?: string;
  full_name?: string;
  roles: string[];
  routes: BackendRoute[];
}

// Role Paths Response
export interface RolePathsResponse {
  role: string;
  paths: string[];
}

// Accessible Path Details
export interface AccessiblePathDetails {
  path: string;
  route_name: string;
  permissions: string[];
  can_edit: boolean;
  can_delete: boolean;
}

// Restricted Path Details
export interface RestrictedPathDetails {
  path: string;
  route_name: string;
  description?: string;
  required_roles: string[];
  reason: string;
}

// Path Statistics
export interface PathStatistics {
  total_routes: number;
  accessible_count: number;
  restricted_count: number;
  access_percentage: number;
}

// User Paths Response (Enhanced endpoint)
export interface UserPathsResponse {
  user_paths: {
    accessible_paths: string[];
    restricted_paths: string[];
    accessible_paths_details: AccessiblePathDetails[];
    restricted_paths_details: RestrictedPathDetails[];
    statistics: PathStatistics;
    user_roles: string[];
    timestamp: string;
  };
}

// System Status
export interface SystemStatus {
  is_initialized: boolean;
  routes_count: number;
  mappings_count: number;
}

// Role Route Mapping
export interface RoleRouteMapping {
  role: string;
  routes: BackendRoute[];
}

// API Response
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
