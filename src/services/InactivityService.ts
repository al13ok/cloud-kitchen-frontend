import AuthService from './AuthService';
import SessionManager from './SessionManager';

interface InactivityConfig {
  timeoutMinutes: number;
  warningMinutes: number;
  enableWarning: boolean;
  enableAutoRefresh: boolean;
}

interface InactivityWarning {
  show: boolean;
  timeLeft: number;
  onExtend: () => void;
  onLogout: () => void;
}

class InactivityService {
  private static instance: InactivityService;
  private timeoutId: NodeJS.Timeout | null = null;
  private warningTimeoutId: NodeJS.Timeout | null = null;
  private refreshIntervalId: NodeJS.Timeout | null = null;
  private isActive: boolean = true;
  private lastActivity: number = Date.now();
  private isWarningShown: boolean = false;
  private warningListeners: ((warning: InactivityWarning) => void)[] = [];
  
  // Configuration - 30 minutes timeout with 5 minute warning
  private config: InactivityConfig = {
    timeoutMinutes: 30,
    warningMinutes: 5,
    enableWarning: true,
    enableAutoRefresh: true
  };
  
  private readonly EVENTS = [
    'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 
    'click', 'keydown', 'keyup', 'wheel', 'touchmove', 'touchend'
  ];
  
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh token every 5 minutes

  private constructor() {
    // Initialize with browser check
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  public static getInstance(): InactivityService {
    if (!InactivityService.instance) {
      InactivityService.instance = new InactivityService();
    }
    return InactivityService.instance;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<InactivityConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart tracking with new config if already running
    if (this.timeoutId) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): InactivityConfig {
    return { ...this.config };
  }

  /**
   * Subscribe to inactivity warnings
   */
  public onWarning(listener: (warning: InactivityWarning) => void): () => void {
    this.warningListeners.push(listener);
    return () => {
      this.warningListeners = this.warningListeners.filter(l => l !== listener);
    };
  }

  private initialize(): void {
    // Only initialize if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    const authService = AuthService.getInstance();
    
    // Subscribe to auth state changes
    authService.subscribe((state) => {
      if (state.isAuthenticated) {
        this.start();
      } else {
        this.stop();
      }
    });
    
    // Start tracking if already authenticated
    if (authService.isAuthenticated()) {
      this.start();
    }
  }

  private startTracking(): void {
    this.resetTimer();
    this.attachEventListeners();
    
    // Start auto-refresh if enabled
    if (this.config.enableAutoRefresh) {
      this.startAutoRefresh();
    }
  }

  private stopTracking(): void {
    this.clearTimer();
    this.clearWarningTimer();
    this.stopAutoRefresh();
    this.detachEventListeners();
    this.hideWarning();
  }

  /**
   * Start automatic token refresh to keep session alive
   */
  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    
    this.refreshIntervalId = setInterval(async () => {
      try {
        const sessionManager = SessionManager.getInstance();
        await sessionManager.getSessionStatus();
      } catch {
        // If auto refresh fails, the session might be expired
        this.handleTimeout();
      }
    }, this.REFRESH_INTERVAL);
  }

  /**
   * Stop automatic token refresh
   */
  private stopAutoRefresh(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  private attachEventListeners(): void {
    this.EVENTS.forEach(event => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private detachEventListeners(): void {
    this.EVENTS.forEach(event => {
      window.removeEventListener(event, this.handleActivity);
    });
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleActivity = (): void => {
    if (!this.isActive) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    // Only reset if significant time has passed (prevent excessive resets)
    if (timeSinceLastActivity > 1000) { // 1 second threshold
      this.lastActivity = now;
      this.resetTimer();
      
      // Hide warning if it's showing
      if (this.isWarningShown) {
        this.hideWarning();
      }
    }
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Page is hidden, but don't pause tracking completely
      // Backend will handle session timeout based on last activity
    } else {
      // Page is visible again, record activity
      this.handleActivity();
    }
  };

  private resetTimer(): void {
    this.clearTimer();
    this.clearWarningTimer();
    
    const timeoutTime = this.config.timeoutMinutes * 60 * 1000; // 30 minutes
    const warningTime = (this.config.timeoutMinutes - this.config.warningMinutes) * 60 * 1000; // 25 minutes

    // Set warning timer first (if enabled)
    if (this.config.enableWarning && this.config.warningMinutes > 0) {
      this.warningTimeoutId = setTimeout(() => {
        this.showWarning();
      }, warningTime);
    }
    
    // Set logout timer
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, timeoutTime);
  }

  private clearTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
  
  private clearWarningTimer(): void {
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
  }

  /**
   * Show inactivity warning
   */
  private showWarning(): void {
    if (this.isWarningShown) return;
    
    this.isWarningShown = true;
    const timeLeft = this.config.warningMinutes * 60; // Convert to seconds

    const warning: InactivityWarning = {
      show: true,
      timeLeft,
      onExtend: () => {
        this.handleActivity();
      },
      onLogout: () => {
        this.handleTimeout();
      }
    };
    
    // Notify all warning listeners
    this.warningListeners.forEach(listener => {
      try {
        listener(warning);
      } catch {
        // Error in warning listener
      }
    });
  }

  /**
   * Hide inactivity warning
   */
  private hideWarning(): void {
    if (!this.isWarningShown) return;
    
    this.isWarningShown = false;

    const warning: InactivityWarning = {
      show: false,
      timeLeft: 0,
      onExtend: () => {},
      onLogout: () => {}
    };
    
    // Notify all warning listeners
    this.warningListeners.forEach(listener => {
      try {
        listener(warning);
      } catch {
        // Error in warning listener
      }
    });
  }

  private async handleTimeout(): Promise<void> {
    try {
      // Clear warning if showing
      this.hideWarning();
      
      // Stop all tracking
      this.stopTracking();
      
      // Get services
      const authService = AuthService.getInstance();
      const sessionManager = SessionManager.getInstance();
      
      // Notify about session timeout
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sessionTimeout', {
          detail: { 
            reason: 'inactivity', 
            duration: this.config.timeoutMinutes,
            lastActivity: new Date(this.lastActivity).toISOString()
          }
        }));
      }
      
      // Try to logout gracefully first
      try {
        await sessionManager.logoutCurrentSession();
      } catch {
        // Graceful logout failed during timeout
      }
      
      // Force logout through auth service
      await authService.logout();
      
    } catch {
      // Error during auto-logout
      // Force cleanup even if logout fails
      const authService = AuthService.getInstance();
      await authService.logout();
    }
  }

  /**
   * Get time remaining until timeout (in seconds)
   */
  public getTimeRemaining(): number {
    if (!this.timeoutId) return 0;
    
    const timeoutTime = this.config.timeoutMinutes * 60 * 1000;
    const elapsed = Date.now() - this.lastActivity;
    const remaining = Math.max(0, timeoutTime - elapsed);
    
    return Math.floor(remaining / 1000);
  }

  /**
   * Get last activity timestamp
   */
  public getLastActivity(): Date {
    return new Date(this.lastActivity);
  }

  /**
   * Check if user is currently active
   */
  public isUserActive(): boolean {
    return this.isActive && !!this.timeoutId;
  }

  /**
   * Manual session extension
   */
  public extendSession(): void {
    this.handleActivity();
  }

  public start(): void {
    const authService = AuthService.getInstance();
    if (authService.isAuthenticated()) {
      this.isActive = true;
      this.lastActivity = Date.now();
      this.startTracking();
    }
  }

  public stop(): void {
    this.isActive = false;
    this.stopTracking();
  }

  public reset(): void {
    if (this.isActive) {
      this.lastActivity = Date.now();
      this.resetTimer();
      
      // Hide warning if it's showing
      if (this.isWarningShown) {
        this.hideWarning();
      }
    }
  }

  /**
   * Cleanup when service is destroyed
   */
  public destroy(): void {
    this.stop();
    this.warningListeners = [];
  }
}

export default InactivityService;
export type { InactivityConfig, InactivityWarning };