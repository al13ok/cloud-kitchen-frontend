import { useState, useEffect } from 'react';
import AuthService, { AuthState, LoginCredentials, User } from '@/services/AuthService';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(AuthService.getInstance().getState());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const authService = AuthService.getInstance();
    
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((newState) => {
      setAuthState(newState);
      setIsInitialized(true);
    });

    // Set initial state
    setAuthState(authService.getState());
    setIsInitialized(true);

    return unsubscribe;
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    return AuthService.getInstance().login(credentials);
  };

  const logout = async (): Promise<void> => {
    return AuthService.getInstance().logout();
  };

  const refreshPermissions = async (): Promise<void> => {
    return AuthService.getInstance().refreshUserPermissions();
  };

  const hasPermission = (resource: string, action: string): boolean => {
    return AuthService.getInstance().hasPermission(resource, action);
  };

  const hasRole = (roleId: string): boolean => {
    return AuthService.getInstance().hasRole(roleId);
  };

  const hasAnyRole = (roleIds: string[]): boolean => {
    return AuthService.getInstance().hasAnyRole(roleIds);
  };

  const getCurrentUser = (): User | null => {
    return AuthService.getInstance().getCurrentUser();
  };

  const isAuthenticated = (): boolean => {
    return AuthService.getInstance().isAuthenticated();
  };

  const getToken = (): string | null => {
    return AuthService.getInstance().getToken();
  };

  return {
    // State
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    isInitialized,

    // Actions
    login,
    logout,
    refreshPermissions,
    hasPermission,
    hasRole,
    hasAnyRole,
    getCurrentUser,
    checkAuth: isAuthenticated,
    getToken,
  };
} 