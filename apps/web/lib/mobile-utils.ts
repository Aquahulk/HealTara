/**
 * Mobile Utility Library
 * Provides device detection, viewport utilities, touch utilities, and performance helpers
 */

// ============================================================================
// Device Detection
// ============================================================================

/**
 * Checks if the current device is a mobile device based on viewport width
 * @returns true if viewport width is less than 768px
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Checks if the current device is running iOS
 * @returns true if the device is running iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Checks if the current device is running Android
 * @returns true if the device is running Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

/**
 * Checks if the current device supports touch events
 * @returns true if the device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ============================================================================
// Viewport Utilities
// ============================================================================

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Gets the viewport height accounting for mobile browser chrome
 * Uses visualViewport API when available, falls back to innerHeight
 * @returns viewport height in pixels
 */
export function getViewportHeight(): number {
  if (typeof window === 'undefined') return 0;
  
  // Use visualViewport API for accurate height (excludes browser chrome)
  if (window.visualViewport) {
    return window.visualViewport.height;
  }
  
  return window.innerHeight;
}

/**
 * Gets the safe area insets for iOS devices with notches
 * @returns safe area insets in pixels
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
  };
}

// ============================================================================
// Touch Utilities
// ============================================================================

/**
 * Prevents zoom on double-tap for an element
 * Sets touch-action: manipulation to prevent default zoom behavior
 * @param element - The HTML element to prevent zoom on
 */
export function preventZoom(element: HTMLElement): void {
  if (!element) return;
  element.style.touchAction = 'manipulation';
}

/**
 * Enables momentum scrolling for an element (iOS)
 * Adds -webkit-overflow-scrolling: touch for smooth momentum scrolling
 * @param element - The HTML element to enable momentum scrolling on
 */
export function enableMomentumScrolling(element: HTMLElement): void {
  if (!element) return;
  (element.style as any).webkitOverflowScrolling = 'touch';
  element.style.overflowY = 'auto';
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Touch-like interface that works with both native Touch and React.Touch
 */
export interface TouchPoint {
  clientX: number;
  clientY: number;
}

/**
 * Detects swipe direction from touch start and end points
 * @param touchStart - The starting touch point
 * @param touchEnd - The ending touch point
 * @param threshold - Minimum distance in pixels to register as a swipe (default: 50)
 * @returns The swipe direction or null if below threshold
 */
export function detectSwipe(
  touchStart: TouchPoint,
  touchEnd: TouchPoint,
  threshold: number = 50
): SwipeDirection | null {
  const deltaX = touchEnd.clientX - touchStart.clientX;
  const deltaY = touchEnd.clientY - touchStart.clientY;
  
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  
  // Check if movement exceeds threshold
  if (absX < threshold && absY < threshold) {
    return null;
  }
  
  // Determine primary direction
  if (absX > absY) {
    return deltaX > 0 ? 'right' : 'left';
  } else {
    return deltaY > 0 ? 'down' : 'up';
  }
}

/**
 * Checks if a touch duration qualifies as a long press
 * @param touchStart - Timestamp when touch started (in milliseconds)
 * @param touchEnd - Timestamp when touch ended (in milliseconds)
 * @param threshold - Minimum duration in milliseconds (default: 500)
 * @returns true if the touch duration exceeds the threshold
 */
export function isLongPress(
  touchStart: number,
  touchEnd: number,
  threshold: number = 500
): boolean {
  return touchEnd - touchStart >= threshold;
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Lazy loads an image and returns a promise that resolves with the image URL
 * @param src - The image source URL
 * @returns Promise that resolves with the image URL when loaded
 */
export function lazyLoadImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Prefetches a Next.js route for faster navigation
 * @param path - The route path to prefetch
 */
export function prefetchRoute(path: string): void {
  if (typeof window === 'undefined') return;
  
  // Create a link element to trigger Next.js prefetch
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = path;
  document.head.appendChild(link);
}

/**
 * Gets the current network connection type
 * @returns Network type or 'unknown' if not available
 */
export function getNetworkType(): '4g' | '3g' | '2g' | 'slow-2g' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection || !connection.effectiveType) {
    return 'unknown';
  }
  
  return connection.effectiveType;
}

/**
 * Gets device memory in GB
 * @returns Device memory in GB or undefined if not available
 */
export function getDeviceMemory(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  return (navigator as any).deviceMemory;
}

/**
 * Gets the number of logical processors available
 * @returns Number of logical processors or undefined if not available
 */
export function getHardwareConcurrency(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  return navigator.hardwareConcurrency;
}

/**
 * Checks if the device is on a slow network (2g or slow-2g)
 * @returns true if on a slow network
 */
export function isSlowNetwork(): boolean {
  const networkType = getNetworkType();
  return networkType === '2g' || networkType === 'slow-2g';
}

/**
 * Checks if the device has limited memory (< 4GB)
 * @returns true if device has limited memory
 */
export function hasLimitedMemory(): boolean {
  const memory = getDeviceMemory();
  return memory !== undefined && memory < 4;
}
