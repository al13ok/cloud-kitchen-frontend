/**
 * Cache Utility Functions
 * Centralized cache clearing for route protection
 */

import RouteProtectionService from '@/services/RouteProtectionService';
import DynamicNavigationService from '@/services/DynamicNavigationService';

/**
 * Clear all route-related caches
 * Use this when routes are updated, permissions change, or cache issues occur
 */
export function clearAllRouteCaches(): void {
  console.log('🗑️ clearAllRouteCaches: Clearing ALL route-related caches...');
  
  try {
    // Clear RouteProtectionService caches
    const routeService = RouteProtectionService.getInstance();
    routeService.clearAllCaches();
    
    // Clear DynamicNavigationService caches
    const navService = DynamicNavigationService.getInstance();
    navService.clearCache();
    
    // Clear localStorage route-related items
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = [];
      
      // Find all route-related keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.toLowerCase().includes('route') ||
          key.toLowerCase().includes('navigation') ||
          key.toLowerCase().includes('rbac')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove found keys
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`   ✅ Removed: ${key}`);
        } catch (e) {
          console.warn(`   ⚠️ Failed to remove ${key}:`, e);
        }
      });
    }
    
    console.log('✅ clearAllRouteCaches: All route caches cleared successfully');
  } catch (error) {
    console.error('❌ clearAllRouteCaches: Error clearing caches:', error);
  }
}

/**
 * Clear cache for a specific route
 */
export function clearRouteCache(route: string): void {
  console.log(`🗑️ clearRouteCache: Clearing cache for route: ${route}`);
  
  try {
    const routeService = RouteProtectionService.getInstance();
    routeService.clearRouteCache(route);
    console.log(`✅ clearRouteCache: Cache cleared for route: ${route}`);
  } catch (error) {
    console.error(`❌ clearRouteCache: Error clearing cache for ${route}:`, error);
  }
}

/**
 * Clear only user routes cache (useful when routes are updated in backend)
 */
export function clearUserRoutesCache(): void {
  console.log('🗑️ clearUserRoutesCache: Clearing user routes cache...');
  
  try {
    const routeService = RouteProtectionService.getInstance();
    routeService.clearCache(); // This clears user routes cache
    console.log('✅ clearUserRoutesCache: User routes cache cleared');
  } catch (error) {
    console.error('❌ clearUserRoutesCache: Error clearing cache:', error);
  }
}

