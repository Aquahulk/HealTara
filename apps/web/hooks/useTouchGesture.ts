/**
 * useTouchGesture Hook
 * Provides gesture detection for swipes, long-press, and pinch-to-zoom
 */

import { useState, useRef, useCallback } from 'react';
import { detectSwipe, isLongPress, type SwipeDirection, type TouchPoint } from '@/lib/mobile-utils';

export interface TouchGestureOptions {
  /** Minimum distance in pixels for swipe detection (default: 50) */
  swipeThreshold?: number;
  /** Minimum duration in milliseconds for long-press detection (default: 500) */
  longPressThreshold?: number;
  /** Enable pinch-to-zoom detection (default: false) */
  enablePinchZoom?: boolean;
  /** Callbacks for gesture events */
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onPinchZoom?: (scale: number) => void;
}

export interface TouchGestureState {
  /** Current gesture being performed */
  currentGesture: 'none' | 'swipe' | 'longpress' | 'pinch';
  /** Direction of swipe gesture */
  swipeDirection: SwipeDirection | null;
  /** Whether a long press is in progress */
  isLongPressing: boolean;
  /** Current pinch scale (1 = no zoom) */
  pinchScale: number;
}

export interface TouchGestureHandlers {
  /** Touch start event handler */
  onTouchStart: (e: React.TouchEvent) => void;
  /** Touch move event handler */
  onTouchMove: (e: React.TouchEvent) => void;
  /** Touch end event handler */
  onTouchEnd: (e: React.TouchEvent) => void;
  /** Current gesture state */
  state: TouchGestureState;
}

/**
 * Hook that provides gesture detection and handling
 * Detects swipes (left, right, up, down), long-press, and pinch-to-zoom
 * @param options - Configuration options and callbacks
 * @returns Touch event handlers and current gesture state
 */
export function useTouchGesture(options: TouchGestureOptions = {}): TouchGestureHandlers {
  const {
    swipeThreshold = 50,
    longPressThreshold = 500,
    enablePinchZoom = false,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    onPinchZoom,
  } = options;

  // State for tracking gesture
  const [state, setState] = useState<TouchGestureState>({
    currentGesture: 'none',
    swipeDirection: null,
    isLongPressing: false,
    pinchScale: 1,
  });

  // Refs for tracking touch data
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceRef = useRef<number>(0);

  /**
   * Calculate distance between two touch points (for pinch detection)
   */
  const getTouchDistance = useCallback((touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  /**
   * Handle touch start event
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 1) {
      // Single touch - potential swipe or long press
      touchStartRef.current = touches[0];
      touchStartTimeRef.current = Date.now();

      // Start long press timer
      longPressTimerRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          currentGesture: 'longpress',
          isLongPressing: true,
        }));
        onLongPress?.();
      }, longPressThreshold);

    } else if (touches.length === 2 && enablePinchZoom) {
      // Two touches - potential pinch
      initialPinchDistanceRef.current = getTouchDistance(touches[0], touches[1]);
      setState(prev => ({
        ...prev,
        currentGesture: 'pinch',
        pinchScale: 1,
      }));

      // Clear long press timer if active
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, [longPressThreshold, enablePinchZoom, getTouchDistance, onLongPress]);

  /**
   * Handle touch move event
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;

    // Clear long press timer on movement
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      setState(prev => ({
        ...prev,
        isLongPressing: false,
      }));
    }

    if (touches.length === 1 && touchStartRef.current) {
      // Single touch movement - potential swipe
      const direction = detectSwipe(touchStartRef.current, touches[0], swipeThreshold);
      
      if (direction) {
        setState(prev => ({
          ...prev,
          currentGesture: 'swipe',
          swipeDirection: direction,
        }));
      }

    } else if (touches.length === 2 && enablePinchZoom && initialPinchDistanceRef.current > 0) {
      // Two touch movement - pinch zoom
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const scale = currentDistance / initialPinchDistanceRef.current;

      setState(prev => ({
        ...prev,
        currentGesture: 'pinch',
        pinchScale: scale,
      }));

      onPinchZoom?.(scale);
    }
  }, [swipeThreshold, enablePinchZoom, getTouchDistance, onPinchZoom]);

  /**
   * Handle touch end event
   */
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Process swipe gesture
    if (touchStartRef.current && e.changedTouches.length > 0) {
      const touchEnd = e.changedTouches[0];
      const direction = detectSwipe(touchStartRef.current, touchEnd, swipeThreshold);

      if (direction) {
        // Trigger appropriate callback
        switch (direction) {
          case 'left':
            onSwipeLeft?.();
            break;
          case 'right':
            onSwipeRight?.();
            break;
          case 'up':
            onSwipeUp?.();
            break;
          case 'down':
            onSwipeDown?.();
            break;
        }
      }

      // Check for long press
      const touchEndTime = Date.now();
      if (isLongPress(touchStartTimeRef.current, touchEndTime, longPressThreshold)) {
        // Long press already triggered in timer, just update state
        setState(prev => ({
          ...prev,
          isLongPressing: false,
        }));
      }
    }

    // Reset state
    setState({
      currentGesture: 'none',
      swipeDirection: null,
      isLongPressing: false,
      pinchScale: 1,
    });

    // Reset refs
    touchStartRef.current = null;
    touchStartTimeRef.current = 0;
    initialPinchDistanceRef.current = 0;
  }, [swipeThreshold, longPressThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    state,
  };
}
