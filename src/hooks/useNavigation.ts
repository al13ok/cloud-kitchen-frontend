import { useState, useEffect } from 'react';
import NavigationService, { NavigationSection, NavigationItem } from '@/services/NavigationService';

export function useNavigation() {
  const [navigation, setNavigation] = useState<NavigationSection[]>([]);
  const [quickActions, setQuickActions] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNavigation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const navService = NavigationService.getInstance();
        await navService.initialize();
        
        const [navData, actionsData] = await Promise.all([
          navService.getNavigation(),
          navService.getQuickActions(),
        ]);
        
        setNavigation(navData);
        setQuickActions(actionsData);
      } catch (err) {
        console.error('Error loading navigation:', err);
        setError('Failed to load navigation');
      } finally {
        setIsLoading(false);
      }
    };

    loadNavigation();
  }, []);

  const getBreadcrumbs = async (path: string): Promise<NavigationItem[]> => {
    try {
      return await NavigationService.getInstance().getBreadcrumbs(path);
    } catch (error) {
      console.error('Error getting breadcrumbs:', error);
      return [];
    }
  };

  const getItemByPath = async (path: string): Promise<NavigationItem | undefined> => {
    try {
      return await NavigationService.getInstance().getItemByPath(path);
    } catch (error) {
      console.error('Error getting navigation item:', error);
      return undefined;
    }
  };

  const refreshNavigation = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await NavigationService.getInstance().refreshNavigation();
      
      const [navData, actionsData] = await Promise.all([
        NavigationService.getInstance().getNavigation(),
        NavigationService.getInstance().getQuickActions(),
      ]);
      
      setNavigation(navData);
      setQuickActions(actionsData);
    } catch (err) {
      console.error('Error refreshing navigation:', err);
      setError('Failed to refresh navigation');
    } finally {
      setIsLoading(false);
    }
  };

  const getSectionById = (sectionId: string): NavigationSection | undefined => {
    return NavigationService.getInstance().getSectionById(sectionId);
  };

  const clearCache = (): void => {
    NavigationService.getInstance().clearCache();
  };

  return {
    navigation,
    quickActions,
    isLoading,
    error,
    getBreadcrumbs,
    getItemByPath,
    refreshNavigation,
    getSectionById,
    clearCache,
  };
} 