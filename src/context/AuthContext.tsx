"use client";
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import AuthService, { AuthState } from '@/services/AuthService';
import RouteGuard from '@/services/RouteGuard';
import NavigationService from '@/services/NavigationService';
import InactivityService from '@/services/InactivityService';

interface AuthContextType {
  authState: AuthState;
  isInitialized: boolean;
  initializeServices: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = React.useState<AuthState>(AuthService.getInstance().getState());
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    const authService = AuthService.getInstance();
    const inactivityService = InactivityService.getInstance();
    
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((newState) => {
      setAuthState(newState);
      
      // Manage inactivity tracking based on authentication state
      if (newState.isAuthenticated) {
        inactivityService.start();
      } else {
        inactivityService.stop();
      }
    });

    // Always set initialized to true immediately for unauthenticated users
    if (!authService.isAuthenticated()) {
      setIsInitialized(true);
    } else {
      // Only initialize services if user is authenticated
      initializeServices();
      // Start inactivity tracking for authenticated users
      inactivityService.start();
    }

    return unsubscribe;
  }, []);

  const initializeServices = async () => {
    try {
      const authService = AuthService.getInstance();
      
      // Only initialize services if user is authenticated
      if (authService.isAuthenticated() && authService.getToken()) {
        // Initialize route guard and navigation services
        await Promise.all([
          RouteGuard.getInstance().initialize(),
          NavigationService.getInstance().initialize(),
        ]);

        // Refresh user permissions
        await authService.refreshUserPermissions();
      }
      
    } catch (error) {
      console.error('AuthContext: Error initializing services:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const value: AuthContextType = {
    authState,
    isInitialized,
    initializeServices,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
} 