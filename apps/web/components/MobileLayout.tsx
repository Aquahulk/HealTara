/**
 * MobileLayout Component
 * Wrapper component for mobile-specific layout concerns including:
 * - Responsive padding management (16px minimum on mobile)
 * - Bottom navigation spacing (64px bottom padding)
 * - Safe area insets for iOS notch support
 * - Scroll restoration
 * - Viewport height calculations accounting for mobile browser chrome
 * 
 * Validates Requirements 1.5, 3.7
 */

'use client';

import React, { useEffect, useRef, type ReactNode } from 'react';
import { useMobile } from '@/context/MobileContext';
import { enableMomentumScrolling } from '@/lib/mobile-utils';

export interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  showHeader?: boolean;
  className?: string;
}

/**
 * MobileLayout component that wraps page content with mobile-specific layout concerns
 * 
 * Features:
 * - Applies responsive padding (16px minimum on mobile)
 * - Adds bottom navigation spacing (64px) when bottom nav is visible
 * - Handles safe area insets for iOS devices with notches
 * - Implements scroll restoration on navigation
 * - Calculates viewport height accounting for mobile browser chrome
 * - Enables momentum scrolling on iOS
 */
export function MobileLayout({
  children,
  showBottomNav = true,
  showHeader = true,
  className = '',
}: MobileLayoutProps): React.ReactElement {
  const { viewport, isBottomNavVisible } = useMobile();
  const containerRef = useRef<HTMLDivElement>(null);

  // Enable momentum scrolling on iOS
  useEffect(() => {
    if (containerRef.current) {
      enableMomentumScrolling(containerRef.current);
    }
  }, []);

  // Scroll restoration: save and restore scroll position on navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (containerRef.current) {
        sessionStorage.setItem('scrollPosition', containerRef.current.scrollTop.toString());
      }
    };

    const restoreScrollPosition = () => {
      const savedPosition = sessionStorage.getItem('scrollPosition');
      if (savedPosition && containerRef.current) {
        containerRef.current.scrollTop = parseInt(savedPosition, 10);
      }
    };

    // Restore scroll position on mount
    restoreScrollPosition();

    // Save scroll position before navigation
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Calculate dynamic styles based on viewport and safe area insets
  const basePaddingHorizontal = viewport.isMobile ? 16 : 24;
  const paddingLeft = basePaddingHorizontal + viewport.safeAreaInsets.left;
  const paddingRight = basePaddingHorizontal + viewport.safeAreaInsets.right;
  
  const basePaddingTop = showHeader ? 64 : 0;
  const paddingTop = basePaddingTop + viewport.safeAreaInsets.top;
  
  const basePaddingBottom = (showBottomNav && isBottomNavVisible && viewport.isMobile) ? 64 : 0;
  const paddingBottom = basePaddingBottom + viewport.safeAreaInsets.bottom;

  const containerStyles: React.CSSProperties = {
    // Use viewport height accounting for mobile browser chrome
    minHeight: viewport.isMobile ? `${viewport.height}px` : '100vh',
    
    // Responsive padding with safe area insets
    paddingLeft: `${paddingLeft}px`,
    paddingRight: `${paddingRight}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
  };

  return (
    <div
      ref={containerRef}
      className={`mobile-layout ${className}`}
      style={containerStyles}
      data-testid="mobile-layout"
    >
      {children}
    </div>
  );
}
