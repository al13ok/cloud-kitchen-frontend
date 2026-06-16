/**
 * Community Authentication Service
 * Handles authentication for community forum functionality
 */

import { CommunityUser } from './UserCommunityService';

// Re-export CommunityUser for external use
export type { CommunityUser };

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface CommunityAuthSession {
  isAuthenticated: boolean;
  user: CommunityUser | null;
  token?: string;
  expiresAt?: string;
}

export interface CommunityLoginCredentials {
  email: string;
  otp?: string;
}

export interface CommunityRegisterCredentials {
  full_name: string;
  email: string;
  role?: string;
  mobile_number?: string;
  email_verified: boolean;
  mobile_verified: boolean;
}

export interface CommunityForgotPasswordRequest {
  email: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// =============================================================================
// COMMUNITY AUTH SERVICE CLASS
// =============================================================================

class CommunityAuthService {
  private static instance: CommunityAuthService;
  private session: CommunityAuthSession = {
    isAuthenticated: false,
    user: null,
  };

  private constructor() {
    this.initializeSession();
  }

  public static getInstance(): CommunityAuthService {
    if (!CommunityAuthService.instance) {
      CommunityAuthService.instance = new CommunityAuthService();
    }
    return CommunityAuthService.instance;
  }

  private initializeSession(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedSession = localStorage.getItem('communityAuthSession');
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        this.session = {
          ...this.session,
          ...parsedSession,
        };
      }
    } catch (error) {
      console.error('Error initializing community auth session:', error);
      this.clearSession();
    }
  }

  private saveSession(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('communityAuthSession', JSON.stringify(this.session));
    } catch (error) {
      console.error('Error saving community auth session:', error);
    }
  }

  private clearSession(): void {
    if (typeof window === 'undefined') return;

    this.session = {
      isAuthenticated: false,
      user: null,
    };

    try {
      localStorage.removeItem('communityAuthSession');
    } catch (error) {
      console.error('Error clearing community auth session:', error);
    }
  }

  /**
   * Get current session information
   */
  public getSession(): CommunityAuthSession {
    return { ...this.session };
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.session.isAuthenticated && !!this.session.user;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): CommunityUser | null {
    return this.session.user;
  }

  /**
   * Set authenticated user (used after successful login/registration)
   */
  public setAuthenticatedUser(user: CommunityUser, token?: string, expiresAt?: string): void {
    this.session = {
      isAuthenticated: true,
      user,
      token,
      expiresAt,
    };
    this.saveSession();
  }

  /**
   * Send OTP for login
   */
  public async sendOTP(channel: 'email' | 'sms', value: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/community-forum/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel,
          value: value
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Failed to send OTP. Please try again.'
        };
      }

      return {
        success: true,
        message: data.message || 'OTP sent successfully'
      };
    } catch (error) {
      console.error('Send OTP error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Verify OTP
   */
  public async verifyOTP(channel: 'email' | 'sms', value: string, otp: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/community-forum/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel,
          value: value,
          otp: otp
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Invalid OTP. Please try again.'
        };
      }

      return {
        success: true,
        message: data.message || 'OTP verified successfully'
      };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Login user with email and OTP
   * Makes API call to authenticate user
   */
  public async login(credentials: CommunityLoginCredentials): Promise<{ success: boolean; data?: CommunityUser; error?: string }> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/community-forum/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          otp: credentials.otp
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Login failed. Please check your credentials.'
        };
      }

      if (data.success && data.data) {
        const user: CommunityUser = data.data;
        this.setAuthenticatedUser(user, data.access_token);
        return {
          success: true,
          data: user
        };
      } else {
        return {
          success: false,
          error: data.message || 'Login failed. Please try again.'
        };
      }
    } catch (error) {
      console.error('Community login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Register new user
   * Makes API call to register user
   */
  public async register(credentials: CommunityRegisterCredentials): Promise<{ success: boolean; data?: CommunityUser; error?: string }> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/community-forum/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: credentials.full_name,
          email: credentials.email,
          role: credentials.role || 'customer',
          mobile_number: credentials.mobile_number,
          email_verified: credentials.email_verified,
          mobile_verified: credentials.mobile_verified
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Registration failed. Please try again.'
        };
      }

      if (data.success && data.data) {
        const user: CommunityUser = data.data;
        this.setAuthenticatedUser(user, data.access_token);
        return {
          success: true,
          data: user
        };
      } else {
        return {
          success: false,
          error: data.message || 'Registration failed. Please try again.'
        };
      }
    } catch (error) {
      console.error('Community registration error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Logout user
   */
  public async logout(): Promise<void> {
    try {
      this.clearSession();
    } catch (error) {
      console.error('Community logout error:', error);
      // Force clear session even if there's an error
      this.clearSession();
    }
  }

  /**
   * Check if session is expired
   */
  public isSessionExpired(): boolean {
    if (!this.session.expiresAt) return false;
    return new Date() > new Date(this.session.expiresAt);
  }

  /**
   * Refresh session (if needed)
   */
  public async refreshSession(): Promise<boolean> {
    if (!this.isAuthenticated() || this.isSessionExpired()) {
      await this.logout();
      return false;
    }
    return true;
  }

  /**
   * Update user profile
   */
  public updateUserProfile(updates: Partial<CommunityUser>): void {
    if (!this.session.user) return;

    this.session.user = {
      ...this.session.user,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveSession();
  }


  /**
   * Request password reset
   */
  public async forgotPassword(request: CommunityForgotPasswordRequest): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${BACKEND_URL}/api/community/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send password reset email',
        };
      }

      return {
        success: true,
        message: data.message || 'Password reset instructions sent to your email',
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }
}

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================

export const communityAuthService = CommunityAuthService.getInstance();
export default communityAuthService;