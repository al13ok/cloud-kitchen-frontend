'use client';

import React, { useState, useEffect } from 'react';
import { 
  getCookiePreferences,
  saveCookiePreferences,
  savePrivacyConsentToAPI,
  logPrivacyEvent,
  getAllCookies,
  clearAllCookies,
  deleteCookie,
  CookieConsent,
  CookiePreferences
} from '@/utils/cookieUtils';

interface CookieManagerProps {
  className?: string;
}

const CookieManager: React.FC<CookieManagerProps> = ({ className = '' }) => {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    functional: false
  });
  const [allCookies, setAllCookies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'preferences' | 'cookies'>('preferences');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [preferencesData, cookiesData] = await Promise.all([
        getCookiePreferences(),
        getAllCookies()
      ]);

      setPreferences(preferencesData || {
        essential: true,
        analytics: false,
        marketing: false,
        functional: false
      });
      setAllCookies(cookiesData);
    } catch (error) {
      console.error('Error loading cookie data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    setPreferences((prev: CookiePreferences) => ({
      ...prev,
      [type]: value
    }));
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const newConsent: CookieConsent = {
        cookie_policy_accepted: true,
        cache_policy_accepted: preferences.functional || preferences.analytics,
        user_cookie_notification: preferences.marketing,
        user_cache_notification: preferences.analytics
      };

      // Save to API and local storage
      await savePrivacyConsentToAPI(newConsent);
      saveCookiePreferences(preferences);
      
      await logPrivacyEvent('preferences_updated', 'User updated cookie preferences');
      
      // Reload cookies
      setAllCookies(getAllCookies());
      
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllCookies = async () => {
    if (window.confirm('Are you sure you want to clear all cookies? This will log you out and reset all preferences.')) {
      try {
        clearAllCookies();
        setAllCookies({});
        setPreferences({
          essential: true,
          analytics: false,
          marketing: false,
          functional: false
        });
        
        await logPrivacyEvent('cookies_cleared', 'User cleared all cookies');
        
        // Reload page to reset state
        window.location.reload();
      } catch (error) {
        console.error('Error clearing cookies:', error);
      }
    }
  };

  const handleDeleteCookie = (name: string) => {
    if (window.confirm(`Are you sure you want to delete the cookie "${name}"?`)) {
      deleteCookie(name);
      setAllCookies(getAllCookies());
    }
  };

  const getCookieType = (name: string): string => {
    if (name.includes('auth') || name.includes('token') || name.includes('session')) {
      return 'Essential';
    }
    if (name.includes('analytics') || name.includes('ga') || name.includes('gtm')) {
      return 'Analytics';
    }
    if (name.includes('marketing') || name.includes('ad') || name.includes('fb')) {
      return 'Marketing';
    }
    if (name.includes('preference') || name.includes('setting') || name.includes('theme')) {
      return 'Functional';
    }
    return 'Unknown';
  };

  const getCookieTypeColor = (type: string): string => {
    switch (type) {
      case 'Essential': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Analytics': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Marketing': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Functional': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Cookie Management
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Manage your cookie preferences and view stored cookies
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cookies'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Stored Cookies ({Object.keys(allCookies).length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Cookie Preferences
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Essential Cookies</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Required for basic site functionality. These cannot be disabled.
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">Always Active</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Analytics Cookies</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Help us understand how visitors interact with our site.
                    </p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => handlePreferenceChange('analytics', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Marketing Cookies</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Used to deliver personalized advertisements.
                    </p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => handlePreferenceChange('marketing', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Functional Cookies</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Remember your preferences and settings.
                    </p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) => handlePreferenceChange('functional', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClearAllCookies}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Clear All Cookies
              </button>
              
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'cookies' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Stored Cookies
            </h3>
            
            {Object.keys(allCookies).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No cookies are currently stored.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(allCookies).map(([name, value]) => {
                  const type = getCookieType(name);
                  return (
                    <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {name}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCookieTypeColor(type)}`}>
                            {type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {value.length > 50 ? `${value.substring(0, 50)}...` : value}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteCookie(name)}
                        className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieManager;
