/**
 * Role-based routing configuration - METADATA ONLY
 * 
 * NOTE: Hardcoded routes are deprecated - all route access is now checked via backend API
 * This config is kept only for role metadata (name, description, colors, etc.)
 * Route access should be checked using RouteProtectionService
 * 
 * All route checking, navigation, and permissions come from backend API:
 * - Routes: RouteProtectionService.getUserRoutes()
 * - Route Access: RouteProtectionService.checkRouteAccess()
 * - Redirects: RouteProtectionService.getUserRedirectPath()
 */
export interface RoleConfig {
  id: string;
  name: string;
  description: string;
  defaultRedirect: string; // DEPRECATED: Use backend API getUserRedirectPath() instead
  allowedRoutes: string[]; // DEPRECATED: Routes come from backend API
  restrictedRoutes: string[]; // DEPRECATED: Routes come from backend API
  color: string;
  textColor: string;
  permissions: string[]; // DEPRECATED: Permissions come from backend API
}

/**
 * DEPRECATED: Hardcoded role configurations removed
 * All role information should now come from backend API
 * This object is kept empty for backwards compatibility
 */
export const roleConfigs: Record<string, RoleConfig> = {};

/**
 * DEPRECATED: Hardcoded navigation structure removed
 * Navigation should now come from backend API via RouteProtectionService.getUserRoutes()
 * This is kept as empty object for backwards compatibility only
 */
export const roleNavigation: Record<string, NavSection[]> = {};

// Helper functions - All deprecated, use backend API instead
/**
 * DEPRECATED: Get role config
 * Role information should come from backend API
 * Returns null as all hardcoded configs have been removed
 */
export function getRoleConfig(_roleId: string): RoleConfig | null {
  void _roleId; // Parameter kept for backward compatibility
  console.warn('getRoleConfig() is deprecated. Role information should come from backend API.');
  return null;
}

/**
 * DEPRECATED: Get role name
 * Role names should come from backend API
 * Returns 'Unknown Role' as all hardcoded configs have been removed
 */
export function getRoleName(_roleId: string): string {
  void _roleId; // Parameter kept for backward compatibility
  console.warn('getRoleName() is deprecated. Role names should come from backend API.');
  return 'Unknown Role';
}

/**
 * Check if a role has access to a route
 * DEPRECATED: Use RouteProtectionService.checkRouteAccess() instead for backend API-based checking
 * This function now returns true as a fallback - actual route checking should be done via backend API
 */
export function hasRouteAccess(_roleId: string, _path: string): boolean {
  void _roleId; // Parameters kept for backward compatibility
  void _path;
  // DEPRECATED: Hardcoded route checking removed
  // All route access checks should now use RouteProtectionService which calls backend API
  // Return true as fallback - actual checking happens via backend
  console.warn('hasRouteAccess() is deprecated. Use RouteProtectionService.checkRouteAccess() instead.');
  return true;
}

/**
 * Get default redirect path for a role
 * DEPRECATED: Use RouteProtectionService.getUserRedirectPath() instead to get redirect from backend
 * This returns a fallback value only
 */
export function getDefaultRedirect(roleId: string): string {
  console.warn('getDefaultRedirect() is deprecated. Use RouteProtectionService.getUserRedirectPath() instead.');
  return roleConfigs[roleId]?.defaultRedirect || '/';
}

/**
 * Get navigation structure for a role
 * DEPRECATED: Navigation should come from backend API via RouteProtectionService.getUserRoutes()
 * This returns empty array - use backend API instead
 */
export function getRoleNavigation(roleId: string): NavSection[] {
  console.warn('getRoleNavigation() is deprecated. Use RouteProtectionService.getUserRoutes() instead.');
  return roleNavigation[roleId] || [];
}

// Type definitions
export interface NavSection {
  section: string;
  type: string;
  icon: string;
  items: Array<{ name: string; path: string; type: string }>;
} 