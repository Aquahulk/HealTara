/**
 * useViewport Hook
 * Provides reactive viewport information including dimensions, device type, orientation, and safe area insets
 */

import { useState, useEffect } from 'react';
import { getViewportHeight, getSafeAreaInsets, type SafeAreaInsets } from '@/lib/mobile-utils';

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean; // < 768px
  isTablet: boolean; // 768px - 1024px
  isDesktop: boolean; // >= 1024px
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: SafeAreaInsets;
}

/**
 * Hook that provides reactive viewport information
 * Updates on window resize and orientation change events
 * @returns Current viewport information
 */
export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => getViewportInfo());

  useEffect(() => {
    // Handler to update viewport info
    const handleResize = () => {
      setViewport(getViewportInfo());
    };

    // Handler for orientation change
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated after orientation change
      setTimeout(() => {
        setViewport(getViewportInfo());
      }, 100);
    };

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return viewport;
}

/**
 * Helper function to calculate viewport information
 * @returns Current viewport information
 */
function getViewportInfo(): ViewportInfo {
  // Server-side rendering fallback
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      orientation: 'portrait',
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }

  const width = window.innerWidth;
  const height = getViewportHeight();
  const safeAreaInsets = getSafeAreaInsets();

  // Determine device type based on width
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // Determine orientation
  const orientation: 'portrait' | 'landscape' = width < height ? 'portrait' : 'landscape';

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    safeAreaInsets,
  };
}
