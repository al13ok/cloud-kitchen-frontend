import {
  getPrivacyConsent as apiGetPrivacyConsent,
  savePrivacyConsentApi,
  logPrivacyEventApi,
} from './api';

export type CookieConsent = {
  cookie_policy_accepted: boolean;
  cache_policy_accepted: boolean;
  user_cookie_notification: boolean;
  user_cache_notification: boolean;
  accepted_at?: string;
  created_at?: string;
  updated_at?: string;
  consent_date?: string;
  consent_version?: string;
  consent_source?: string;
};

export const COOKIE_TYPES = {
  ESSENTIAL: 'essential',
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
  FUNCTIONAL: 'functional',
};

export type CookieType = keyof typeof COOKIE_TYPES;

export type CookiePreferences = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
};

export const COOKIE_CONFIG = {
  essential: { description: 'Required for basic site functionality' },
  analytics: { description: 'Help us understand how visitors interact with our site' },
  marketing: { description: 'Used to deliver personalized advertisements' },
  functional: { description: 'Remember your preferences and settings' },
};

export function getCookiePreferences(): CookiePreferences {
  return {
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function saveCookiePreferences(_prefs: CookiePreferences): void {}

export function getAllCookies(): Record<string, string> {
  return {};
}

export function clearAllCookies(): void {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function deleteCookie(_name: string): void {}

export function hasValidConsent(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const localConsent = localStorage.getItem('privacy_consent');
    if (localConsent) {
      const consent = JSON.parse(localConsent);
      return !!consent?.cookie_policy_accepted;
    }
  } catch {
    // If parsing fails, clear the invalid data
    localStorage.removeItem('privacy_consent');
  }
  
  return false;
}

export function hasConsent(): boolean {
  return hasValidConsent();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isCookieAllowed(_type: CookieType): boolean {
  return false;
}

export function getLocalPrivacyConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const localConsent = localStorage.getItem('privacy_consent');
    console.log('Checking localStorage for privacy_consent:', localConsent ? 'found' : 'not found');
    
    if (localConsent) {
      const parsedConsent = JSON.parse(localConsent);
      console.log('Parsed consent:', parsedConsent);
      
      // Return local consent if it exists and is valid
      if (parsedConsent?.cookie_policy_accepted !== undefined) {
        console.log('Valid consent found in localStorage');
        return parsedConsent;
      }
    }
  } catch (error) {
    console.warn('Error parsing localStorage consent, clearing:', error);
    // If parsing fails, clear the invalid data
    localStorage.removeItem('privacy_consent');
  }
  
  console.log('No valid consent found in localStorage');
  return null;
}

export async function getPrivacyConsent(): Promise<CookieConsent | null> {
  // First check local storage
  if (typeof window !== 'undefined') {
    const localConsent = localStorage.getItem('privacy_consent');
    if (localConsent) {
      try {
        const parsedConsent = JSON.parse(localConsent);
        // Return local consent if it exists and is valid
        if (parsedConsent?.cookie_policy_accepted !== undefined) {
          return parsedConsent;
        }
      } catch {
        // If parsing fails, clear the invalid data
        localStorage.removeItem('privacy_consent');
      }
    }
  }
  
  // If no valid local consent, try API (this will be handled by the calling function)
  try {
    return await apiGetPrivacyConsent();
  } catch (error) {
    // Log the error for debugging but don't break the UI
    console.warn('Privacy consent API call failed:', error);
    return null;
  }
}

export async function savePrivacyConsentToAPI(consent: CookieConsent): Promise<boolean> {
  // Check if user is authenticated before attempting API call
  const isAuthenticated = (() => {
    if (typeof window === 'undefined') return false;
    
    // Check for authentication tokens
    const hasAccessToken = !!localStorage.getItem('access_token');
    const hasJwtToken = !!localStorage.getItem('jwtToken');
    const hasAuthCookie = document.cookie.includes('isAuthenticated=true');
    
    return hasAccessToken || hasJwtToken || hasAuthCookie;
  })();
  
  // If not authenticated, save locally only
  if (!isAuthenticated) {
    console.log('User not authenticated, saving consent locally only');
    savePrivacyConsent(consent);
    return true;
  }
  
  // User is authenticated, try to save to API
  try {
    console.log('Attempting to save consent to API:', consent);
    await savePrivacyConsentApi(consent);
    console.log('API save successful, now saving to localStorage');
    // Save locally only after successful API save
    savePrivacyConsent(consent);
    return true;
  } catch (error) {
    // Check if it's an authentication error
    const isAuthError = error instanceof Error && 
      (error.message.includes('Authentication failed') || 
       error.message.includes('401') ||
       error.message.includes('Unauthorized'));
    
    if (isAuthError) {
      // Authentication failed - user may have logged out, save locally
      console.warn('Authentication failed while saving consent, saving locally instead');
      savePrivacyConsent(consent);
      return true;
    }
    
    // For other errors, log but still save locally for unauthenticated pages
    console.error('Failed to save consent to API:', error);
    
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath === '/signin' || currentPath === '/signup') {
        console.log('User on signin/signup page, saving consent locally despite API failure');
        savePrivacyConsent(consent);
        return true;
      }
    }
    
    // For authenticated users with non-auth errors, still save locally as fallback
    console.warn('API save failed, saving consent locally as fallback');
    savePrivacyConsent(consent);
    return true;
  }
}

export async function fetchPrivacyConsent(): Promise<CookieConsent | null> {
  return getPrivacyConsent();
}

// Replace your logPrivacyEvent implementation with this:
export async function logPrivacyEvent(event: string, details?: string): Promise<void> {
    try {
      await logPrivacyEventApi({ event_type: event, reason: details ?? '' });
    } catch {
      // Do not break UX if logging fails
    }
  }

export function savePrivacyConsent(consent: CookieConsent): void {
  if (typeof window !== 'undefined') {
    try {
      console.log('Saving privacy consent to localStorage:', consent);
      localStorage.setItem('privacy_consent', JSON.stringify(consent));
      console.log('Privacy consent saved successfully to localStorage');
    } catch (error) {
      console.warn('Failed to save privacy consent to local storage:', error);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setCookieIfAllowed(_name: string, _value: string, _type: string): void {}

export function clearPrivacyConsent(): void {
  if (typeof window !== 'undefined') {
    try {
      console.log('Clearing privacy consent from localStorage');
      localStorage.removeItem('privacy_consent');
      console.log('Privacy consent cleared successfully');
    } catch (error) {
      console.warn('Failed to clear privacy consent from local storage:', error);
    }
  }
}

// Development helper to check current consent status
// Usage: Open browser console and run: checkConsentStatus()
export function checkConsentStatus(): void {
  if (typeof window !== 'undefined') {
    const consent = getLocalPrivacyConsent();
    const hasValid = hasValidConsent();
    console.log('📊 Current consent status:', {
      hasValidConsent: hasValid,
      hasConsent: !!consent?.cookie_policy_accepted,
      consentData: consent,
      rawLocalStorage: localStorage.getItem('privacy_consent')
    });
    
    // Make globally accessible for easier debugging
    (window as unknown as {
      cookieConsentDebug: {
        hasValidConsent: typeof hasValidConsent;
        getLocalPrivacyConsent: typeof getLocalPrivacyConsent;
        clearPrivacyConsent: typeof clearPrivacyConsent;
        clearAllUserDataIncludingConsent: typeof clearAllUserDataIncludingConsent;
        forceSetConsent: typeof forceSetConsent;
        testLocalStorage: typeof testLocalStorage;
        testCookieBanner: typeof testCookieBanner;
        checkConsentStatus: typeof checkConsentStatus;
      };
    }).cookieConsentDebug = {
      hasValidConsent,
      getLocalPrivacyConsent,
      clearPrivacyConsent,
      clearAllUserDataIncludingConsent,
      forceSetConsent,
      testLocalStorage,
      testCookieBanner,
      checkConsentStatus
    };
    
    console.log('💡 Debug tools available at window.cookieConsentDebug');
  }
}

// Test localStorage persistence
export function testLocalStorage(): void {
  if (typeof window !== 'undefined') {
    console.log('📋 Testing localStorage persistence...');
    
    // Test 1: Basic localStorage test
    const testKey = 'localStorage_test';
    const testValue = 'test_value_' + Date.now();
    
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    
    console.log('Basic localStorage test:', {
      saved: testValue,
      retrieved: retrieved,
      matches: testValue === retrieved
    });
    
    // Test 2: Privacy consent specific test
    const currentConsent = localStorage.getItem('privacy_consent');
    console.log('Current privacy_consent in localStorage:', currentConsent);
    
    if (currentConsent) {
      try {
        const parsed = JSON.parse(currentConsent);
        console.log('Parsed consent:', parsed);
        console.log('Cookie policy accepted:', !!parsed?.cookie_policy_accepted);
      } catch (e) {
        console.error('Error parsing stored consent:', e);
      }
    }
    
    // Cleanup test
    localStorage.removeItem(testKey);
    
    console.log('✅ localStorage test complete');
  }
}

// Force save consent (for debugging)
export function forceSetConsent(): void {
  if (typeof window !== 'undefined') {
    const testConsent: CookieConsent = {
      cookie_policy_accepted: true,
      cache_policy_accepted: true,
      user_cookie_notification: true,
      user_cache_notification: true,
      consent_date: new Date().toISOString(),
      consent_version: '2.0',
      consent_source: 'debug_force_set'
    };
    
    console.log('🔧 Force setting consent for debugging...');
    localStorage.setItem('privacy_consent', JSON.stringify(testConsent));
    console.log('✅ Consent force-set. Reload page to test.');
    console.log('Current localStorage:', localStorage.getItem('privacy_consent'));
  }
}

// Development helper function to test cookie banner
// Usage: Open browser console and run: testCookieBanner()
export function testCookieBanner(): void {
  if (typeof window !== 'undefined') {
    console.log('🧪 Testing cookie banner - clearing consent and reloading...');
    clearPrivacyConsent();
    console.log('✅ Consent cleared, reloading page...');
    window.location.reload();
  }
}

/**
 * Clears all chat-related data from localStorage
 * This function should be called during logout to ensure chat data is removed
 */
export function clearChatData(): void {
  if (typeof window === 'undefined') return;
  
  // Clear all chat-related localStorage items
  const chatKeys = [
    'chatbot_messages',
    'chatbot_session_id',
    'selectedChatbotAvatar',
    'chatbotName',
    'chatbotWelcomeMessage',
    'adminGreetingCount',
    'numResults',
    'similarityThreshold',
    'jobFormHeading',
    'recentSessions',
    'messageRepetitions',
    'chatTimelineFilter',
    'chatCustomRange',
    'timelineFilter',
    'customRange'
  ];
  
  chatKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage items related to chat
  const sessionKeys = [
    'chatbot_welcome_shown',
    'isLoggingOut'
  ];
  
  sessionKeys.forEach(key => {
    sessionStorage.removeItem(key);
  });
}

/**
 * Clears all user-related data from localStorage and sessionStorage
 * This is a comprehensive cleanup function for logout
 * Note: Privacy consent is preserved for unauthenticated sessions
 */
export function clearAllUserData(): void {
  if (typeof window === 'undefined') return;
  
  // Clear chat data
  clearChatData();
  
  // Note: We intentionally do NOT clear privacy consent here
  // Privacy consent should persist even after logout for better UX
  // Only clear it manually if needed using clearPrivacyConsent()
  
  // Clear authentication and user data
  const authKeys = [
    'access_token',
    'userData',
    'loginResponse',
    'userEmail',
    'user_id',
    'role_id',
    'login_flag',
    'full_name',
    'isAuthenticated',
    'jwtToken',
    'userType',
    'whatsappCredentials'
  ];
  
  authKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear cookies
  const cookieOptions = [
    'path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'path=/; domain=; expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  
  cookieOptions.forEach(options => {
    document.cookie = `access_token=; ${options}`;
    document.cookie = `isAuthenticated=; ${options}`;
    document.cookie = `XSRF-TOKEN=; ${options}`;
  });
}

/**
 * Full logout with option to clear privacy consent
 * Use this when you want to clear consent as well
 */
export function clearAllUserDataIncludingConsent(): void {
  clearAllUserData();
  clearPrivacyConsent();
}