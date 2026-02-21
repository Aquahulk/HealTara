/**
 * Example usage of MobileContext
 * This file demonstrates how to consume the mobile context in components
 */

'use client';

import React from 'react';
import { useMobile } from './MobileContext';

/**
 * Example component showing how to use the useMobile hook
 */
export function MobileContextExample() {
  const {
    viewport,
    isBottomNavVisible,
    setBottomNavVisible,
    isHamburgerMenuOpen,
    setHamburgerMenuOpen,
    performanceMetrics,
  } = useMobile();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Mobile Context Example</h2>

      {/* Viewport Information */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">Viewport Information</h3>
        <ul className="space-y-1 text-sm">
          <li>Width: {viewport.width}px</li>
          <li>Height: {viewport.height}px</li>
          <li>Device Type: {viewport.isMobile ? 'Mobile' : viewport.isTablet ? 'Tablet' : 'Desktop'}</li>
          <li>Orientation: {viewport.orientation}</li>
          <li>Safe Area Insets: Top={viewport.safeAreaInsets.top}, Bottom={viewport.safeAreaInsets.bottom}</li>
        </ul>
      </div>

      {/* Navigation State */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">Navigation State</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">Bottom Nav Visible:</span>
            <button
              onClick={() => setBottomNavVisible(!isBottomNavVisible)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              {isBottomNavVisible ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Hamburger Menu Open:</span>
            <button
              onClick={() => setHamburgerMenuOpen(!isHamburgerMenuOpen)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              {isHamburgerMenuOpen ? 'Close' : 'Open'}
            </button>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">Performance Metrics</h3>
        <ul className="space-y-1 text-sm">
          <li>First Contentful Paint: {performanceMetrics.fcp.toFixed(0)}ms</li>
          <li>Largest Contentful Paint: {performanceMetrics.lcp.toFixed(0)}ms</li>
          <li>First Input Delay: {performanceMetrics.fid.toFixed(0)}ms</li>
          <li>Cumulative Layout Shift: {performanceMetrics.cls.toFixed(3)}</li>
          <li>Time to First Byte: {performanceMetrics.ttfb.toFixed(0)}ms</li>
          <li>Network Type: {performanceMetrics.networkType}</li>
          {performanceMetrics.deviceMemory && (
            <li>Device Memory: {performanceMetrics.deviceMemory}GB</li>
          )}
          {performanceMetrics.hardwareConcurrency && (
            <li>CPU Cores: {performanceMetrics.hardwareConcurrency}</li>
          )}
        </ul>
      </div>

      {/* Conditional Rendering Based on Device Type */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">Conditional Rendering</h3>
        {viewport.isMobile && (
          <p className="text-sm text-green-600">✓ Mobile-specific content shown</p>
        )}
        {viewport.isTablet && (
          <p className="text-sm text-blue-600">✓ Tablet-specific content shown</p>
        )}
        {viewport.isDesktop && (
          <p className="text-sm text-purple-600">✓ Desktop-specific content shown</p>
        )}
      </div>
    </div>
  );
}

/**
 * Example: Simple component that hides on mobile
 */
export function DesktopOnlyComponent() {
  const { viewport } = useMobile();

  if (viewport.isMobile) {
    return null;
  }

  return <div>This content is only visible on desktop</div>;
}

/**
 * Example: Component that adapts layout based on device
 */
export function ResponsiveCard() {
  const { viewport } = useMobile();

  return (
    <div
      className={`
        border rounded p-4
        ${viewport.isMobile ? 'flex-col' : 'flex-row'}
        ${viewport.isMobile ? 'space-y-2' : 'space-x-4'}
      `}
    >
      <div className="flex-1">Content 1</div>
      <div className="flex-1">Content 2</div>
    </div>
  );
}

/**
 * Example: Component that uses performance metrics
 */
export function PerformanceWarning() {
  const { performanceMetrics } = useMobile();

  // Show warning if FCP is slow (> 2000ms)
  if (performanceMetrics.fcp > 2000) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <p className="text-sm">
          Page load is slower than expected. Consider optimizing your connection.
        </p>
      </div>
    );
  }

  return null;
}

/**
 * Example: Component that controls bottom nav visibility
 */
export function ContentWithHiddenNav({ children }: { children: React.ReactNode }) {
  const { setBottomNavVisible } = useMobile();

  React.useEffect(() => {
    // Hide bottom nav when this component mounts
    setBottomNavVisible(false);

    // Show it again when unmounting
    return () => {
      setBottomNavVisible(true);
    };
  }, [setBottomNavVisible]);

  return <div>{children}</div>;
}
