"use client";

 

 

 

import { useState, useEffect } from 'react';

 

 

 

// Type definitions for Google Maps
// Using interface augmentation to extend Window without conflicting with other declarations
type GoogleMapInstance = Record<string, unknown>;

interface GoogleMarkerIcon {
  url?: string;
  scaledSize?: { width: number; height: number };
}

interface GoogleMapsNamespace {
  Map: new (
    element: HTMLElement,
    options?: {
      center?: { lat: number; lng: number };
      zoom?: number;
      mapTypeId?: string;
    }
  ) => GoogleMapInstance;
  Marker: new (options?: {
    position?: { lat: number; lng: number };
    map?: GoogleMapInstance;
    title?: string;
    icon?: GoogleMarkerIcon;
  }) => GoogleMapInstance;
  InfoWindow: new (options?: {
    content?: string;
  }) => {
    open: (map: GoogleMapInstance, marker: GoogleMapInstance) => void;
  };
  Size: new (width: number, height: number) => { width: number; height: number };
}

// Note: google is declared as 'unknown' in AttendanceComponent.tsx, so we use a union type here
declare global {
  interface Window {
    google:
      | {
          maps: GoogleMapsNamespace;
        }
      | unknown;
  }
}

 

 

 

interface Location {
  lat: number;
  lng: number;
}

 

 

 

type LocationStatus = 'available' | 'unavailable' | 'loading';

 

 

 

// IP Geolocation Data Interface
export interface IPInfo {
  ip: string;
  country: string;
  city: string;
  region?: string;
  state?: string;
  timezone?: string;
  isp?: string;
  organization?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
}

 

 

 

// Load Google Maps script
const loadGoogleMapsScript = () => {
  // Check if script is already being loaded
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) {
    return;
  }

 

 

 

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCQh_9aLU9kZ4VybxQ6fDJd-8J4d02kmyg&libraries=places`;
  script.async = true;
  script.defer = true;

 

 

 

  script.onload = () => {
    console.log('Google Maps script loaded successfully');
  };

 

 

 

  script.onerror = (error) => {
    console.error('Error loading Google Maps script:', error);
  };

 

 

 

  document.head.appendChild(script);
};

 

 

 

export const useGPS = () => {
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('loading');
  const [locationError, setLocationError] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);

 

 

 

  // Load Google Maps script on mount
  useEffect(() => {
    loadGoogleMapsScript();
  }, []);

 

 

 

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus('available');
          setLocationError('');
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error.message || error);
          setLocationStatus('unavailable');

 

 

 

          // Handle specific error types
          let errorMessage = 'Unable to retrieve your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
            default:
              errorMessage = 'An unknown error occurred while retrieving location.';
              break;
          }

 

 

 

          setLocationError(errorMessage);
          setCurrentLocation(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setLocationStatus('unavailable');
      setLocationError('Geolocation is not supported by this browser');
      setCurrentLocation(null);
    }
  };

 

 

 

  const initializeMap = () => {
    try {
      // Check if Google Maps API is available
      if (!window.google || typeof window.google !== 'object' || !('maps' in window.google)) {
        console.warn('Google Maps API not fully loaded yet');
        return;
      }
      
      const googleMaps = (window.google as { maps: GoogleMapsNamespace }).maps;

 

 

 

      if (!currentLocation) {
        console.warn('Current location not available');
        return;
      }

 

 

 

      const mapElement = document.getElementById('google-map');
      if (!mapElement) {
        console.warn('Map element not found');
        return;
      }

 

 

 

      const map = new googleMaps.Map(mapElement, {
        center: currentLocation,
        zoom: 16,
        mapTypeId: 'roadmap',
      });

 

 

 

      // Add marker for current location
      const marker = new googleMaps.Marker({
        position: currentLocation,
        map: map,
        title: 'Your Current Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="white" stroke-width="4"/>
              <circle cx="20" cy="20" r="8" fill="white"/>
            </svg>
          `),
          scaledSize: new googleMaps.Size(40, 40),
        }
      });

 

 

 

      // Add info window
      const infoWindow = new googleMaps.InfoWindow({
        content: `
          <div style="padding: 10px; font-family: Arial, sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937;">Your Location</h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Lat: ${currentLocation.lat.toFixed(6)}<br>
              Lng: ${currentLocation.lng.toFixed(6)}
            </p>
          </div>
        `
      });

 

 

 

      // Open info window by default
      infoWindow.open(map, marker);

 

 

 

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

 

 

 

  const handleLocationClick = () => {
    if (locationStatus === 'available' && currentLocation) {
      setShowMap(true);
      // Wait a bit longer to ensure the map container is rendered and Google Maps API is ready
      setTimeout(() => {
        if (window.google && typeof window.google === 'object' && 'maps' in window.google) {
          initializeMap();
        } else {
          console.warn('Google Maps API not ready, retrying...');
          // Retry after a short delay
          setTimeout(initializeMap, 500);
        }
      }, 200);
    } else {
      getCurrentLocation();
    }
  };

 

 

 

  return {
    locationStatus,
    locationError,
    currentLocation,
    showMap,
    setShowMap,
    getCurrentLocation,
    initializeMap,
    handleLocationClick,
  };
};

 

 

 

/**
 * Get IP address and geolocation information
 * Uses ipapi.co API (free tier: 1000 requests/day)
 * Fallback to ip-api.com if ipapi.co fails
 */
type IpApiResponse = {
  status?: 'success' | 'fail';
  message?: string;
  query?: string;
  country?: string;
  city?: string;
  regionName?: string;
  timezone?: string;
  isp?: string;
  org?: string;
  countryCode?: string;
  lat?: number;
  lon?: number;
};

export const getIPInfo = async (): Promise<IPInfo | null> => {
  try {
    // First, try to get IP from ipapi.co
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.reason || 'IP API error');
        }
        
        return {
          ip: data.ip || '',
          country: data.country_name || '',
          city: data.city || '',
          region: data.region || '',
          state: data.region || '',
          timezone: data.timezone || '',
          isp: data.org || '',
          organization: data.org || '',
          country_code: data.country_code || '',
          latitude: data.latitude || undefined,
          longitude: data.longitude || undefined,
        };
      }
    } catch (ipapiError) {
      console.warn('ipapi.co failed, trying ip-api.com:', ipapiError);
    }

 

 

 

    // Fallback to ip-api.com (free tier: HTTP only). Try HTTPS first; if it fails with SSL message, retry HTTP.
    const response = await fetch('https://ip-api.com/json/');
    let data: IpApiResponse | null = null;
    if (response.ok) {
      data = await response.json();
      if (data?.status === 'success') {
        return {
          ip: data.query || '',
          country: data.country || '',
          city: data.city || '',
          region: data.regionName || '',
          state: data.regionName || '',
          timezone: data.timezone || '',
          isp: data.isp || '',
          organization: data.org || '',
          country_code: data.countryCode || '',
          latitude: data.lat || undefined,
          longitude: data.lon || undefined,
        };
      }
    }
    // If HTTPS failed or returned SSL unavailable, try HTTP (only safe on http:// origins like localhost)
    if (!data || data?.status === 'fail') {
      const msg = data?.message || '';
      const isHttpOrigin = typeof window !== 'undefined' && window.location.protocol === 'http:';
      if (isHttpOrigin || msg.toLowerCase().includes('ssl unavailable')) {
        const httpResp = await fetch('http://ip-api.com/json/');
        if (httpResp.ok) {
          const httpData: IpApiResponse = await httpResp.json();
          if (httpData?.status === 'success') {
            return {
              ip: httpData.query || '',
              country: httpData.country || '',
              city: httpData.city || '',
              region: httpData.regionName || '',
              state: httpData.regionName || '',
              timezone: httpData.timezone || '',
              isp: httpData.isp || '',
              organization: httpData.org || '',
              country_code: httpData.countryCode || '',
              latitude: httpData.lat || undefined,
              longitude: httpData.lon || undefined,
            };
          }
        }
      }
      // If still failing, throw to trigger the next fallback
      if (data?.status === 'fail') {
        throw new Error(data?.message || 'IP API error');
      }
    }

 

 

 

    throw new Error('Both IP geolocation APIs failed');
  } catch (error) {
    console.error('Error fetching IP information:', error);
    
    // Try to get IP address from a simpler service
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        return {
          ip: ipData.ip || 'Unknown',
          country: 'Unknown',
          city: 'Unknown',
          region: 'Unknown',
          state: 'Unknown',
          timezone: 'Unknown',
          isp: 'Unknown',
          organization: 'Unknown',
        };
      }
    } catch (ipError) {
      console.error('Error fetching IP address:', ipError);
    }
    
    return null;
  }
};

 

 

 

/**
 * Get IP information and return it as a formatted object
 * This function can be called from anywhere in the application
 */
export const fetchIPGeolocation = async (): Promise<IPInfo | null> => {
  return await getIPInfo();
};