"use client";
import { useEffect } from 'react';

interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
}

const PerformanceMonitor = () => {
  useEffect(() => {
    // Only run in production and if Web Vitals are available
    if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') {
      return;
    }

    const metrics: PerformanceMetrics = {};

    // Measure First Contentful Paint (FCP)
    const measureFCP = () => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.fcp = entry.startTime;
            console.log('FCP:', entry.startTime);
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
    };

    // Measure Largest Contentful Paint (LCP)
    const measureLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.lcp = lastEntry.startTime;
        console.log('LCP:', lastEntry.startTime);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    };

    // Measure First Input Delay (FID)
    const measureFID = () => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          metrics.fid = fidEntry.processingStart - fidEntry.startTime;
          console.log('FID:', metrics.fid);
        }
      });
      observer.observe({ entryTypes: ['first-input'] });
    };

    // Measure Cumulative Layout Shift (CLS)
    const measureCLS = () => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value || 0;
          }
        }
        metrics.cls = clsValue;
        console.log('CLS:', clsValue);
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    };

    // Measure Time to First Byte (TTFB)
    const measureTTFB = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        console.log('TTFB:', metrics.ttfb);
      }
    };

    // Initialize measurements
    measureFCP();
    measureLCP();
    measureFID();
    measureCLS();
    measureTTFB();

    // Log performance metrics after page load
    const logMetrics = () => {
      console.group('🚀 Performance Metrics');
      console.log('First Contentful Paint (FCP):', metrics.fcp?.toFixed(2) + 'ms');
      console.log('Largest Contentful Paint (LCP):', metrics.lcp?.toFixed(2) + 'ms');
      console.log('First Input Delay (FID):', metrics.fid?.toFixed(2) + 'ms');
      console.log('Cumulative Layout Shift (CLS):', metrics.cls?.toFixed(4));
      console.log('Time to First Byte (TTFB):', metrics.ttfb?.toFixed(2) + 'ms');
      console.groupEnd();

      // Send metrics to analytics (if needed)
      if (typeof window !== 'undefined' && (window as unknown as { gtag?: (command: string, action: string, parameters: Record<string, unknown>) => void }).gtag) {
        const gtag = (window as unknown as { gtag: (command: string, action: string, parameters: Record<string, unknown>) => void }).gtag;
        gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: 'Login Page',
          value: Math.round(metrics.lcp || 0),
          custom_map: {
            fcp: Math.round(metrics.fcp || 0),
            lcp: Math.round(metrics.lcp || 0),
            fid: Math.round(metrics.fid || 0),
            cls: Math.round((metrics.cls || 0) * 1000),
            ttfb: Math.round(metrics.ttfb || 0),
          }
        });
      }
    };

    // Log metrics after a delay to ensure all measurements are complete
    const timeoutId = setTimeout(logMetrics, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;
