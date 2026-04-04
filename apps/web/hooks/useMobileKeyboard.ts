/**
 * useMobileKeyboard Hook
 * Detects mobile keyboard open/close state and provides utilities for keyboard-aware scrolling
 */

import { useState, useEffect, useCallback } from 'react';

export interface MobileKeyboardState {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
  scrollToInput: (element: HTMLElement) => void;
}

/**
 * Hook that detects mobile keyboard state using viewport height changes
 * Provides keyboard height calculation and auto-scroll functionality
 * @returns Mobile keyboard state and utilities
 */
export function useMobileKeyboard(): MobileKeyboardState {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [initialViewportHeight] = useState(() => 
    typeof window !== 'undefined' ? window.visualViewport?.height || window.innerHeight : 0
  );

  useEffect(() => {
    // Server-side rendering guard
    if (typeof window === 'undefined') {
      return;
    }

    // Handler to detect keyboard state changes
    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;

      // Keyboard is considered open if viewport height decreased by more than 150px
      // This threshold helps avoid false positives from browser chrome changes
      const keyboardOpen = heightDifference > 150;

      setIsKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? heightDifference : 0);
    };

    // Use visualViewport API if available (better for mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', handleViewportChange);
    }

    // Cleanup
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleViewportChange);
      }
    };
  }, [initialViewportHeight]);

  /**
   * Scrolls the given input element into view, accounting for the keyboard
   * Ensures the input remains visible above the keyboard
   */
  const scrollToInput = useCallback((element: HTMLElement) => {
    if (!element) return;

    // Small delay to ensure keyboard is fully open
    setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      
      // Calculate if element is hidden by keyboard
      const elementBottom = rect.bottom;
      const isHiddenByKeyboard = elementBottom > viewportHeight;

      if (isHiddenByKeyboard) {
        // Scroll element into view with some padding
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 300); // Wait for keyboard animation
  }, []);

  return {
    isKeyboardOpen,
    keyboardHeight,
    scrollToInput,
  };
}
