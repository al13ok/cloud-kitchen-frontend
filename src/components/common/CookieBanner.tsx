'use client';

 

import React, { useState, useEffect, useCallback } from 'react';
import { 
  getLocalPrivacyConsent,
  hasValidConsent, 
  savePrivacyConsentToAPI,
  savePrivacyConsent,
  fetchPrivacyConsent,
  logPrivacyEvent,
  CookieConsent,
  COOKIE_TYPES,
  setCookieIfAllowed
} from '@/utils/cookieUtils';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

 

interface CookieBannerProps {
  onConsentChange?: (consent: CookieConsent) => void;
  className?: string;
}

 

// Development logging helper
const devLog = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CookieBanner] ${message}`, data || '');
  }
};

const CookieBanner: React.FC<CookieBannerProps> = ({ 
  onConsentChange,
  className = ''
}) => {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false); // Always start hidden
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false); // Track if we've checked consent
  const [preferences, setPreferences] = useState({
    essential: true, // Always true
    analytics: false,
    marketing: false,
    functional: false
  });

  // Immediate consent check on component mount
  useEffect(() => {
    // Quick initial check to prevent banner flash
    const shouldShowOnPage = (isAuthenticated && pathname === '/') || (!isAuthenticated && pathname === '/signin');
    
    if (shouldShowOnPage) {
      if (hasValidConsent()) {
        devLog('Component mount: valid consent found, staying hidden');
        setShowBanner(false);
        setLoading(false);
        setConsentChecked(true);
        return;
      } else {
        devLog('Component mount: no valid consent found');
        setConsentChecked(true);
        // Don't set loading to false here, let the main useEffect handle it
      }
    } else {
      setLoading(false);
      setConsentChecked(true);
    }
  }, [isAuthenticated, pathname]); // Include dependencies


 

  const checkConsentStatus = useCallback(async () => {
    try {
      // Show on home page (authenticated) or signin page (unauthenticated)
      const shouldShowOnPage = (isAuthenticated && pathname === '/') || (!isAuthenticated && pathname === '/signin');
      
      if (!shouldShowOnPage) {
        setShowBanner(false);
        setLoading(false);
        return;
      }

      // Check local storage first (synchronous, fast)
      if (hasValidConsent()) {
        devLog('checkConsentStatus: valid consent found, hiding banner');
        setShowBanner(false);
        setLoading(false);
        return;
      }

      const hasLocalConsent = false; // We already checked above, so this is false

      devLog('Cookie consent check:', { 
        pathname, 
        isAuthenticated, 
        hasLocalConsent, 
        localConsent: 'none (already checked)' 
      });

      // No local consent found, so we need to check further
      // For authenticated users, also check API
      if (isAuthenticated) {
        try {
          const apiConsent = await fetchPrivacyConsent();
          const hasApiConsent = !!apiConsent?.cookie_policy_accepted;

          if (hasApiConsent) {
            // API has consent but local doesn't - save locally and hide banner
            devLog('API consent found, saving locally and hiding banner');
            savePrivacyConsent(apiConsent);
            setShowBanner(false);
          } else {
            // Neither local nor API has consent - show banner
            devLog('No consent found, showing banner');
            setShowBanner(true);
          }
        } catch (apiError) {
          console.warn('API call failed, showing banner for consent:', apiError);
          // API failed and no local consent - show banner
          setShowBanner(true);
        }
      } else {
        // Unauthenticated user with no local consent - show banner
        devLog('Unauthenticated user, no local consent, showing banner');
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error checking consent status:', error);
      setShowBanner(true); // Show banner if error
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    // Check consent status on home page (authenticated) or signin page (unauthenticated)
    const shouldShowOnPage = (isAuthenticated && pathname === '/') || (!isAuthenticated && pathname === '/signin');
    
    if (shouldShowOnPage) {
      // First, immediately check local storage to prevent banner flash
      if (hasValidConsent()) {
        devLog('Main useEffect: valid consent found, hiding banner');
        setShowBanner(false);
        setLoading(false);
        return;
      }
      
      // If set by AuthService, show banner after navigating to home page and clear the flag
      try {
        if (sessionStorage.getItem('showConsentAfterLogin') === 'true') {
          setShowBanner(true);
          setLoading(false);
          sessionStorage.removeItem('showConsentAfterLogin');
          // Reconcile with API in background
          fetchPrivacyConsent().then(apiConsent => {
            if (apiConsent?.cookie_policy_accepted) {
              savePrivacyConsent(apiConsent);
              setShowBanner(false);
            }
          }).catch(() => {});
          return;
        }
      } catch {}

      // No local consent and no special session flag - run full check immediately
      checkConsentStatus();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, pathname, checkConsentStatus]);

 

  // Listen for login event to prepare cookie banner for home page
  useEffect(() => {
    const handleUserLogin = () => {
      // Set flag to show banner when user navigates to home page
      try {
        sessionStorage.setItem('showConsentAfterLogin', 'true');
      } catch {}
      
      // Don't show banner immediately - wait for navigation to home page
      // The banner will be shown when the user reaches the home page (pathname === '/')
    };

 

    window.addEventListener('userLoggedIn', handleUserLogin);
    
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLogin);
    };
  }, []);

 

  // Check for existing consent and show "Manage Cookies" button
  useEffect(() => {
    const checkExistingConsent = async () => {
      // Check consent for both authenticated and unauthenticated users
      try {
        const existingConsent = getLocalPrivacyConsent();
        if (existingConsent?.cookie_policy_accepted) {
          // Consent exists locally
        }
      } catch (error) {
        console.error('Error checking existing consent:', error);
      }
    };
    
    checkExistingConsent();
  }, []);

 



 

  const handleAcceptAll = async () => {
    setLoading(true);
    try {
      const consent: CookieConsent = {
        cookie_policy_accepted: true,
        cache_policy_accepted: true,
        user_cookie_notification: true,
        user_cache_notification: true,
        consent_date: new Date().toISOString(),
        consent_version: '2.0',
        consent_source: 'banner_accept_all'
      };

      devLog('Accepting all cookies, saving consent:', consent);
      
      // Save to API first (this will also save locally on success)
      const success = await savePrivacyConsentToAPI(consent);
      
      if (success) {
        devLog('Consent saved successfully, hiding banner');
        
        // Set all cookie preferences to true
        const allPreferences = {
          essential: true,
          analytics: true,
          marketing: true,
          functional: true
        };
        
        setPreferences(allPreferences);
        
        // Set some example cookies for different types
        setCookieIfAllowed('analytics_id', 'user_' + Date.now(), COOKIE_TYPES.ANALYTICS);
        setCookieIfAllowed('marketing_preferences', 'all', COOKIE_TYPES.MARKETING);
        setCookieIfAllowed('user_preferences', 'theme=dark', COOKIE_TYPES.FUNCTIONAL);
        
        setShowBanner(false);
        onConsentChange?.(consent);
        
        // Log the consent event (only if API is available)
        try {
          await logPrivacyEvent('consent_given', 'Accept all cookies');
        } catch {
          // Ignore logging errors
        }
      } else {
        console.error('Failed to save consent - this should not happen on signin page');
        // Still hide banner if we're on signin page
        if (pathname === '/signin') {
          devLog('On signin page, hiding banner despite API failure');
          setShowBanner(false);
        }
      }
      
    } catch (error) {
      console.error('Error accepting all cookies:', error);
    } finally {
      setLoading(false);
    }
  };

 

  const handleAcceptEssential = async () => {
    setLoading(true);
    try {
      const consent: CookieConsent = {
        cookie_policy_accepted: true,
        cache_policy_accepted: false,
        user_cookie_notification: false,
        user_cache_notification: false,
        consent_date: new Date().toISOString(),
        consent_version: '2.0',
        consent_source: 'banner_essential_only'
      };

      // Save to API (this will also save locally on success)
      const success = await savePrivacyConsentToAPI(consent);
      
      if (success) {
        const essentialPreferences = {
          essential: true,
          analytics: false,
          marketing: false,
          functional: false
        };
        
        setPreferences(essentialPreferences);
        setShowBanner(false);
        onConsentChange?.(consent);
        
        try {
          await logPrivacyEvent('consent_given', 'Essential cookies only');
        } catch {
          // Ignore logging errors
        }
      } else if (pathname === '/signin') {
        // Still hide banner if we're on signin page
        setShowBanner(false);
      }
      
    } catch (error) {
      console.error('Error accepting essential cookies:', error);
    } finally {
      setLoading(false);
    }
  };

 

  const handleCustomPreferences = async () => {
    setLoading(true);
    try {
      const consent: CookieConsent = {
        cookie_policy_accepted: true,
        cache_policy_accepted: preferences.functional || preferences.analytics,
        user_cookie_notification: preferences.marketing,
        user_cache_notification: preferences.analytics,
        consent_date: new Date().toISOString(),
        consent_version: '2.0',
        consent_source: 'banner_custom_preferences'
      };

      // Save to API (this will also save locally on success)
      const success = await savePrivacyConsentToAPI(consent);
      
      if (success) {
        setShowBanner(false);
        onConsentChange?.(consent);
        
        try {
          await logPrivacyEvent('consent_given', 'Custom preferences');
        } catch {
          // Ignore logging errors
        }
      } else if (pathname === '/signin') {
        // Still hide banner if we're on signin page
        setShowBanner(false);
      }
      
    } catch (error) {
      console.error('Error saving custom preferences:', error);
    } finally {
      setLoading(false);
    }
  };

 

  const handlePreferenceChange = (type: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };


 

  // Final safety check before rendering
  if (loading || !showBanner || !consentChecked) {
    return null;
  }

  // Ultimate safety check using the most reliable method
  if (hasValidConsent()) {
    devLog('Ultimate safety check: valid consent found, preventing render');
    // This should never happen, but if it does, hide the banner immediately
    setShowBanner(false);
    return null;
  }

  devLog('Rendering cookie banner - all checks passed');

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 border-t border-gray-200 dark:border-gray-700 shadow-lg backdrop-blur-sm ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Cookies on this site
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              We use cookies to make our site work (strictly necessary) and, with your consent, to measure usage, 
              improve our services, and show personalized content/ads. You can accept or reject non-essential cookies now, 
              and change your choice anytime in Privacy settings. See our{' '}
              <a href="/cookie-policy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Cookies Policy</a> and{' '}
              <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Privacy Notice</a>.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
            <button
              onClick={handleAcceptAll}
              disabled={loading}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? 'Processing...' : 'Accept all'}
            </button>
            <button
              onClick={handleAcceptEssential}
              disabled={loading}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? 'Processing...' : 'Reject non-essential'}
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              disabled={loading}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Manage choices
            </button>
          </div>
        </div>
        
        {/* Cookie Details */}
        {showDetails && (
          <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-gray-50/80 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-4">
              Cookie Preferences
            </h4>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Essential Cookies */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 gap-2 sm:gap-0">
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Strictly necessary</h5>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">Always on; required for basic functions.</p>
                </div>
                <span className="px-2 sm:px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full self-start sm:self-auto">
                  Always Active
                </span>
              </div>

 

              {/* Analytics Cookies */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 gap-2 sm:gap-0">
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Analytics</h5>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">Helps us measure and improve.</p>
                </div>
                <label className="flex items-center self-start sm:self-auto">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => handlePreferenceChange('analytics', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-2"
                  />
                </label>
              </div>

 

              {/* Functional Cookies */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 gap-2 sm:gap-0">
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Personalization</h5>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">Remembers your settings/content.</p>
                </div>
                <label className="flex items-center self-start sm:self-auto">
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) => handlePreferenceChange('functional', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-2"
                  />
                </label>
              </div>

 

              {/* Marketing Cookies */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 gap-2 sm:gap-0">
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Advertising</h5>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">Shows relevant ads and limits repeats.</p>
                </div>
                <label className="flex items-center self-start sm:self-auto">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => handlePreferenceChange('marketing', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-2"
                  />
                </label>
              </div>
            </div>

 

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={handleCustomPreferences}
                disabled={loading}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save choices'}
              </button>
              <button
                onClick={handleAcceptEssential}
                disabled={loading}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {loading ? 'Processing...' : 'Reject all non-essential'}
              </button>
              <button
                onClick={handleAcceptAll}
                disabled={loading}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {loading ? 'Processing...' : 'Accept all'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

 

export default CookieBanner;

 

