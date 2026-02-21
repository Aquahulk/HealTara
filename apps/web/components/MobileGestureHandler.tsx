/**
 * MobileGestureHandler Component
 * Reusable gesture handling wrapper for mobile interactions
 * Supports swipe, pull-to-refresh, long-press, pinch-to-zoom, and momentum scrolling
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useTouchGesture, type TouchGestureOptions } from '@/hooks/useTouchGesture';
import { enableMomentumScrolling } from '@/lib/mobile-utils';

export interface MobileGestureHandlerProps {
  /** Child elements to wrap with gesture handling */
  children: React.ReactNode;
  /** Callback for swipe left gesture */
  onSwipeLeft?: () => void;
  /** Callback for swipe right gesture */
  onSwipeRight?: () => void;
  /** Callback for swipe up gesture */
  onSwipeUp?: () => void;
  /** Callback for swipe down gesture */
  onSwipeDown?: () => void;
  /** Callback for pull-to-refresh gesture (returns promise for async refresh) */
  onPullRefresh?: () => Promise<void>;
  /** Callback for long-press gesture */
  onLongPress?: () => void;
  /** Enable pinch-to-zoom support (default: false) */
  enablePinchZoom?: boolean;
  /** Callback for pinch-to-zoom gesture */
  onPinchZoom?: (scale: number) => void;
  /** Enable momentum scrolling (default: true) */
  enableMomentumScroll?: boolean;
  /** Minimum pull distance for refresh trigger (default: 100px) */
  pullRefreshThreshold?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MobileGestureHandler wraps content with mobile gesture detection
 * Provides swipe, pull-to-refresh, long-press, pinch-to-zoom, and momentum scrolling
 */
export function MobileGestureHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPullRefresh,
  onLongPress,
  enablePinchZoom = false,
  onPinchZoom,
  enableMomentumScroll = true,
  pullRefreshThreshold = 100,
  className = '',
}: MobileGestureHandlerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartYRef = useRef<number>(0);
  const scrollTopRef = useRef<number>(0);

  // Set up touch gesture handling
  const gestureOptions: TouchGestureOptions = {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    enablePinchZoom,
    onPinchZoom,
  };

  const { onTouchStart, onTouchMove, onTouchEnd, state } = useTouchGesture(gestureOptions);

  /**
   * Handle pull-to-refresh gesture
   */
  const handlePullRefreshStart = useCallback((e: React.TouchEvent) => {
    if (!onPullRefresh || isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    // Only trigger pull-to-refresh when scrolled to top
    const scrollTop = container.scrollTop;
    scrollTopRef.current = scrollTop;

    if (scrollTop === 0 && e.touches.length === 1) {
      pullStartYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [onPullRefresh, isRefreshing]);

  const handlePullRefreshMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || !onPullRefresh || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartYRef.current;

    // Only allow pulling down (positive distance)
    if (distance > 0 && scrollTopRef.current === 0) {
      setPullDistance(Math.min(distance, pullRefreshThreshold * 1.5));
      
      // Prevent default scroll behavior while pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, onPullRefresh, isRefreshing, pullRefreshThreshold]);

  const handlePullRefreshEnd = useCallback(async () => {
    if (!isPulling || !onPullRefresh) return;

    setIsPulling(false);

    // Trigger refresh if pulled beyond threshold
    if (pullDistance >= pullRefreshThreshold) {
      setIsRefreshing(true);
      try {
        await onPullRefresh();
      } catch (error) {
        console.error('Pull-to-refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Animate back to 0
      setPullDistance(0);
    }

    pullStartYRef.current = 0;
    scrollTopRef.current = 0;
  }, [isPulling, pullDistance, pullRefreshThreshold, onPullRefresh]);

  /**
   * Combined touch start handler
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    onTouchStart(e);
    handlePullRefreshStart(e);
  }, [onTouchStart, handlePullRefreshStart]);

  /**
   * Combined touch move handler
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    onTouchMove(e);
    handlePullRefreshMove(e);
  }, [onTouchMove, handlePullRefreshMove]);

  /**
   * Combined touch end handler
   */
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    onTouchEnd(e);
    handlePullRefreshEnd();
  }, [onTouchEnd, handlePullRefreshEnd]);

  /**
   * Enable momentum scrolling on mount
   */
  useEffect(() => {
    if (enableMomentumScroll && containerRef.current) {
      enableMomentumScrolling(containerRef.current);
    }
  }, [enableMomentumScroll]);

  /**
   * Calculate pull-to-refresh indicator transform
   */
  const pullIndicatorTransform = isPulling || isRefreshing
    ? `translateY(${Math.min(pullDistance, pullRefreshThreshold)}px)`
    : 'translateY(0)';

  const pullIndicatorOpacity = isPulling || isRefreshing
    ? Math.min(pullDistance / pullRefreshThreshold, 1)
    : 0;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        WebkitOverflowScrolling: enableMomentumScroll ? 'touch' : undefined,
        touchAction: enablePinchZoom ? 'none' : 'pan-y',
      }}
    >
      {/* Pull-to-refresh indicator */}
      {onPullRefresh && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none"
          style={{
            transform: pullIndicatorTransform,
            opacity: pullIndicatorOpacity,
            transition: isPulling ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
            height: '60px',
            marginTop: '-60px',
          }}
        >
          <div className="flex items-center gap-2 text-gray-600">
            {isRefreshing ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm font-medium">Refreshing...</span>
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                <span className="text-sm font-medium">
                  {pullDistance >= pullRefreshThreshold ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
}
