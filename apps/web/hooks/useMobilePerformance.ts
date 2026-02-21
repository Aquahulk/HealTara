/**
 * useMobilePerformance Hook
 * Monitors mobile performance metrics including web vitals (FCP, LCP, FID, CLS, TTFB)
 * and device capabilities (network type, memory, CPU)
 */

import { useState, useEffect, useCallback } from 'react';
import { getNetworkType, getDeviceMemory, getHardwareConcurrency } from '@/lib/mobile-utils';

export interface MobilePerformanceMetrics {
  fcp: number; // First Contentful Paint (ms)
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift (score)
  ttfb: number; // Time to First Byte (ms)
  networkType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface MobilePerformanceHook {
  metrics: MobilePerformanceMetrics;
  reportMetric: (name: string, value: number) => void;
}

/**
 * Hook that monitors mobile performance metrics
 * Tracks web vitals using Performance API and provides device capability information
 * @returns Performance metrics and custom metric reporting function
 */
export function useMobilePerformance(): MobilePerformanceHook {
  const [metrics, setMetrics] = useState<MobilePerformanceMetrics>(() => ({
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
    networkType: getNetworkType(),
    deviceMemory: getDeviceMemory(),
    hardwareConcurrency: getHardwareConcurrency(),
  }));

  useEffect(() => {
    // Server-side rendering guard
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    // Track First Contentful Paint (FCP)
    const observeFCP = () => {
      if (typeof PerformanceObserver === 'undefined') return null;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({
              ...prev,
              fcp: entry.startTime,
            }));
            observer.disconnect();
          }
        }
      });

      try {
        observer.observe({ type: 'paint', buffered: true });
      } catch (e) {
        // Paint timing not supported
      }

      return observer;
    };

    // Track Largest Contentful Paint (LCP)
    const observeLCP = () => {
      if (typeof PerformanceObserver === 'undefined') return null;
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        setMetrics(prev => ({
          ...prev,
          lcp: lastEntry.startTime,
        }));
      });

      try {
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        // LCP not supported
      }

      return observer;
    };

    // Track First Input Delay (FID)
    const observeFID = () => {
      if (typeof PerformanceObserver === 'undefined') return null;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // FID is the delay between user interaction and browser response
          const fidEntry = entry as any;
          const fid = fidEntry.processingStart - fidEntry.startTime;
          
          setMetrics(prev => ({
            ...prev,
            fid,
          }));
          observer.disconnect();
        }
      });

      try {
        observer.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        // FID not supported
      }

      return observer;
    };

    // Track Cumulative Layout Shift (CLS)
    const observeCLS = () => {
      if (typeof PerformanceObserver === 'undefined') return null;
      
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as any;
          // Only count layout shifts without recent user input
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
            
            setMetrics(prev => ({
              ...prev,
              cls: clsValue,
            }));
          }
        }
      });

      try {
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        // CLS not supported
      }

      return observer;
    };

    // Track Time to First Byte (TTFB)
    const measureTTFB = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        
        setMetrics(prev => ({
          ...prev,
          ttfb,
        }));
      }
    };

    // Initialize all observers
    const fcpObserver = observeFCP();
    const lcpObserver = observeLCP();
    const fidObserver = observeFID();
    const clsObserver = observeCLS();
    
    // Measure TTFB immediately
    measureTTFB();

    // Update network type periodically (it can change)
    const networkInterval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        networkType: getNetworkType(),
      }));
    }, 5000); // Check every 5 seconds

    // Cleanup
    return () => {
      fcpObserver?.disconnect();
      lcpObserver?.disconnect();
      fidObserver?.disconnect();
      clsObserver?.disconnect();
      clearInterval(networkInterval);
    };
  }, []);

  /**
   * Reports a custom performance metric
   * Uses Performance API's mark and measure features
   * @param name - Name of the custom metric
   * @param value - Value of the metric (in milliseconds)
   */
  const reportMetric = useCallback((name: string, value: number) => {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    try {
      // Create a performance mark for the custom metric
      performance.mark(name);
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${value}ms`);
      }

      // You can also send to analytics service here
      // Example: analytics.track('performance_metric', { name, value });
    } catch (e) {
      // Performance API not fully supported
      console.warn('Failed to report metric:', name, e);
    }
  }, []);

  return {
    metrics,
    reportMetric,
  };
}
