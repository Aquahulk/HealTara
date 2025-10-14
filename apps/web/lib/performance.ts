// ============================================================================
// 🚀 PERFORMANCE OPTIMIZATION UTILITIES
// ============================================================================
// This file contains utilities to optimize loading performance across the app
// Includes caching, prefetching, and request optimization strategies
// ============================================================================
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// Cache configuration
const CACHE_CONFIG = {
  HOMEPAGE: {
    TTL: 5 * 60 * 1000, // 5 minutes
    KEY: 'homepage_cache'
  },
  ADMIN: {
    TTL: 2 * 60 * 1000, // 2 minutes
    KEY: 'admin_cache'
  },
  SLOTS: {
    TTL: 10 * 60 * 1000, // 10 minutes
    KEY: 'slots_cache'
  }
};

// Generic cache utility
export class CacheManager {
  static set(key: string, data: any, ttl: number = CACHE_CONFIG.HOMEPAGE.TTL): void {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  static get(key: string): any | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp, ttl } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > ttl;
      
      if (isExpired) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  static clear(pattern?: string): void {
    try {
      if (pattern) {
        Object.keys(localStorage).forEach(key => {
          if (key.includes(pattern)) {
            localStorage.removeItem(key);
          }
        });
      } else {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('_cache') || key.includes('_timestamp')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}

// Request deduplication utility
class RequestDeduplicator {
  private static pendingRequests = new Map<string, Promise<any>>();

  static async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

// Optimized data loading with caching and deduplication
export async function loadWithCache<T>(
  cacheKey: string,
  requestFn: () => Promise<T>,
  ttl: number = CACHE_CONFIG.HOMEPAGE.TTL
): Promise<T> {
  // Check cache first
  const cached = CacheManager.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Deduplicate requests
  return RequestDeduplicator.dedupe(cacheKey, async () => {
    const data = await requestFn();
    CacheManager.set(cacheKey, data, ttl);
    return data;
  });
}

// Prefetch utility for critical data
export function prefetchData() {
  // Prefetch homepage data on app start
  if (typeof window !== 'undefined') {
    // Only prefetch if not already cached
    const homepageCache = CacheManager.get('homepage_doctors');
    const hospitalsCache = CacheManager.get('homepage_hospitals');
    
    if (!homepageCache || !hospitalsCache) {
      // Prefetch in background
      import('@/lib/api').then(({ apiClient }) => {
        Promise.allSettled([
          apiClient.getDoctors({ sort: 'trending', page: 1, pageSize: 6 }),
          apiClient.getHospitals()
        ]).then(([doctorsRes, hospitalsRes]) => {
          if (doctorsRes.status === 'fulfilled') {
            CacheManager.set('homepage_doctors', doctorsRes.value, CACHE_CONFIG.HOMEPAGE.TTL);
          }
          if (hospitalsRes.status === 'fulfilled') {
            CacheManager.set('homepage_hospitals', hospitalsRes.value, CACHE_CONFIG.HOMEPAGE.TTL);
          }
        });
      });
    }
  }
}

// Performance monitoring utility
export class PerformanceMonitor {
  static startTiming(label: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${label}-start`);
    }
  }

  static endTiming(label: string): number {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      const measure = performance.getEntriesByName(label)[0];
      return measure ? measure.duration : 0;
    }
    return 0;
  }

  static logTiming(label: string, duration: number): void {
    if (duration > 1000) { // Log slow operations
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }
  }
}

// Image lazy loading utility
export function lazyLoadImage(img: HTMLImageElement, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// Component lazy loading utility
export function lazyLoadComponent<TProps = unknown>(
  importFn: () => Promise<{ default: ComponentType<TProps> }>
): LazyExoticComponent<ComponentType<TProps>> {
  return lazy(importFn);
}

// Memory usage optimization
export function optimizeMemoryUsage(): void {
  // Clear old cache entries
  const now = Date.now();
  Object.keys(localStorage).forEach(key => {
    if (key.includes('_timestamp')) {
      const timestamp = localStorage.getItem(key);
      if (timestamp && now - parseInt(timestamp) > 30 * 60 * 1000) { // 30 minutes
        const dataKey = key.replace('_timestamp', '');
        localStorage.removeItem(dataKey);
        localStorage.removeItem(key);
      }
    }
  });
}

// Initialize performance optimizations
if (typeof window !== 'undefined') {
  // Clear memory every 5 minutes
  setInterval(optimizeMemoryUsage, 5 * 60 * 1000);
  
  // Prefetch data on idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(prefetchData);
  } else {
    setTimeout(prefetchData, 1000);
  }
}
