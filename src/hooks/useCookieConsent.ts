import { useState, useEffect, useCallback } from 'react';
import { 
  getPrivacyConsent, 
  savePrivacyConsent, 
  savePrivacyConsentToAPI,
  fetchPrivacyConsent,
  CookieConsent,
  hasConsent,
  isCookieAllowed,
  CookieType
} from '@/utils/cookieUtils';

interface UseCookieConsentReturn {
  consent: CookieConsent | null;
  hasConsent: boolean;
  isCookieAllowed: (type: CookieType) => boolean;
  loading: boolean;
  saveConsent: (consent: CookieConsent) => Promise<boolean>;
  refreshConsent: () => Promise<void>;
}

export function useCookieConsent(): UseCookieConsentReturn {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConsent = useCallback(async () => {
    try {
      setLoading(true);
      
      // First try to get from local storage
      const localConsent = await getPrivacyConsent();
      
      if (localConsent) {
        setConsent(localConsent);
      } else {
        // Try to fetch from API
        try {
          const apiConsent = await fetchPrivacyConsent();
          if (apiConsent) {
            setConsent(apiConsent);
            // Save locally for future use
            savePrivacyConsent(apiConsent);
          }
        } catch (apiError) {
          console.warn('API call failed, using local consent only:', apiError);
          // Continue with local consent if API fails
        }
      }
    } catch (error) {
      console.error('Error loading cookie consent:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConsent = useCallback(async (newConsent: CookieConsent): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Save to API first
      const success = await savePrivacyConsentToAPI(newConsent);
      if (success !== undefined && success) {
        // Save locally
        savePrivacyConsent(newConsent);
        setConsent(newConsent);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error saving cookie consent:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshConsent = useCallback(async () => {
    await loadConsent();
  }, [loadConsent]);

  const checkCookieAllowed = useCallback((type: CookieType): boolean => {
    return isCookieAllowed(type);
  }, []);

  useEffect(() => {
    loadConsent();
  }, [loadConsent]);

  return {
    consent,
    hasConsent: hasConsent(),
    isCookieAllowed: checkCookieAllowed,
    loading,
    saveConsent,
    refreshConsent
  };
}
