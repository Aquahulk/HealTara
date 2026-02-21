/**
 * TouchFeedback Component
 * Provides visual and haptic feedback for touch interactions on mobile devices
 * 
 * Features:
 * - Visual feedback (scale, opacity) on touch
 * - Haptic feedback using Vibration API
 * - Debounce protection (300ms default)
 * - Ripple effect animation
 * 
 * Requirements: 2.3, 2.4, 15.6
 */

'use client';

import React, { useRef, useState, useCallback, type ReactNode, type TouchEvent, type MouseEvent } from 'react';

export interface TouchFeedbackProps {
  children: ReactNode;
  onPress?: () => void;
  haptic?: boolean;
  ripple?: boolean;
  debounce?: number;
  disabled?: boolean;
  className?: string;
}

interface RippleState {
  x: number;
  y: number;
  size: number;
  show: boolean;
}

/**
 * TouchFeedback component
 * Wraps any child element to add touch feedback effects
 */
export function TouchFeedback({
  children,
  onPress,
  haptic = true,
  ripple = true,
  debounce = 300,
  disabled = false,
  className = '',
}: TouchFeedbackProps): React.ReactElement {
  const [isPressed, setIsPressed] = useState(false);
  const [rippleState, setRippleState] = useState<RippleState>({
    x: 0,
    y: 0,
    size: 0,
    show: false,
  });
  
  const lastPressTime = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Triggers haptic feedback if enabled and supported
   */
  const triggerHaptic = useCallback(() => {
    if (!haptic || typeof window === 'undefined') return;
    
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [haptic]);

  /**
   * Creates ripple effect at touch/click position
   */
  const createRipple = useCallback((clientX: number, clientY: number) => {
    if (!ripple || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Calculate ripple size based on container dimensions
    const size = Math.max(rect.width, rect.height) * 2;

    setRippleState({
      x,
      y,
      size,
      show: true,
    });

    // Hide ripple after animation
    setTimeout(() => {
      setRippleState(prev => ({ ...prev, show: false }));
    }, 600);
  }, [ripple]);

  /**
   * Handles press action with debounce protection
   */
  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;

    const now = Date.now();
    
    // Debounce protection - prevent double-tap
    if (now - lastPressTime.current < debounce) {
      return;
    }

    lastPressTime.current = now;
    onPress();
  }, [disabled, onPress, debounce]);

  /**
   * Touch start handler
   */
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (disabled) return;

    const touch = e.touches[0];
    setIsPressed(true);
    
    if (ripple) {
      createRipple(touch.clientX, touch.clientY);
    }
    
    triggerHaptic();
  }, [disabled, ripple, createRipple, triggerHaptic]);

  /**
   * Touch end handler
   */
  const handleTouchEnd = useCallback(() => {
    if (disabled) return;

    setIsPressed(false);
    handlePress();
  }, [disabled, handlePress]);

  /**
   * Touch cancel handler
   */
  const handleTouchCancel = useCallback(() => {
    if (disabled) return;
    setIsPressed(false);
  }, [disabled]);

  /**
   * Mouse down handler (for desktop testing)
   */
  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    setIsPressed(true);
    
    if (ripple) {
      createRipple(e.clientX, e.clientY);
    }
  }, [disabled, ripple, createRipple]);

  /**
   * Mouse up handler (for desktop testing)
   */
  const handleMouseUp = useCallback(() => {
    if (disabled) return;

    setIsPressed(false);
    handlePress();
  }, [disabled, handlePress]);

  /**
   * Mouse leave handler (for desktop testing)
   */
  const handleMouseLeave = useCallback(() => {
    if (disabled) return;
    setIsPressed(false);
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className={`touch-feedback-container ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        display: 'inline-block',
        overflow: 'hidden',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'transform 100ms ease-out, opacity 100ms ease-out',
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
        opacity: isPressed ? 0.8 : 1,
      }}
    >
      {children}
      
      {/* Ripple effect */}
      {rippleState.show && (
        <span
          className="touch-feedback-ripple"
          style={{
            position: 'absolute',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%) scale(0)',
            animation: 'ripple-animation 600ms ease-out',
            left: rippleState.x,
            top: rippleState.y,
            width: rippleState.size,
            height: rippleState.size,
          }}
        />
      )}

      <style jsx>{`
        @keyframes ripple-animation {
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default TouchFeedback;
