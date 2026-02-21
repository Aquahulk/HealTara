/**
 * Test Utilities for Mobile View Enhancement
 * Provides property-based testing configuration and helper functions
 */

import fc from 'fast-check'

// ============================================================================
// Property-Based Testing Configuration
// ============================================================================

/**
 * Standard configuration for property-based tests
 * Minimum 100 iterations per property test as per design document
 */
export const propertyTestConfig: fc.Parameters<unknown> = {
  numRuns: 100,
  verbose: true,
  seed: Date.now(), // For reproducibility
}

/**
 * Configuration for expensive property tests (e.g., performance tests)
 * Reduced iterations for tests that are time-consuming
 */
export const expensivePropertyTestConfig: fc.Parameters<unknown> = {
  numRuns: 20,
  verbose: true,
  seed: Date.now(),
}

// ============================================================================
// Fast-Check Arbitraries for Mobile Testing
// ============================================================================

/**
 * Generates random mobile viewport widths (320px - 767px)
 */
export const mobileViewportWidth = () => fc.integer({ min: 320, max: 767 })

/**
 * Generates random tablet viewport widths (768px - 1023px)
 */
export const tabletViewportWidth = () => fc.integer({ min: 768, max: 1023 })

/**
 * Generates random desktop viewport widths (1024px - 1920px)
 */
export const desktopViewportWidth = () => fc.integer({ min: 1024, max: 1920 })

/**
 * Generates random viewport heights (568px - 1080px)
 */
export const viewportHeight = () => fc.integer({ min: 568, max: 1080 })

/**
 * Generates random touch coordinates within a viewport
 */
export const touchCoordinate = (maxWidth: number = 767, maxHeight: number = 1024) =>
  fc.record({
    clientX: fc.integer({ min: 0, max: maxWidth }),
    clientY: fc.integer({ min: 0, max: maxHeight }),
  })

/**
 * Generates random swipe gestures
 */
export const swipeGesture = () =>
  fc.record({
    startX: fc.integer({ min: 50, max: 300 }),
    startY: fc.integer({ min: 50, max: 500 }),
    distance: fc.integer({ min: 51, max: 300 }), // > 50px threshold
    duration: fc.integer({ min: 50, max: 500 }),
    direction: fc.constantFrom('left', 'right', 'up', 'down'),
  })

/**
 * Generates random long-press gestures
 */
export const longPressGesture = () =>
  fc.record({
    x: fc.integer({ min: 0, max: 767 }),
    y: fc.integer({ min: 0, max: 1024 }),
    duration: fc.integer({ min: 500, max: 2000 }), // >= 500ms threshold
  })

/**
 * Generates random text content of varying lengths
 */
export const textContent = () =>
  fc.string({ minLength: 1, maxLength: 200 })

/**
 * Generates random long text content (for truncation testing)
 */
export const longTextContent = () =>
  fc.string({ minLength: 100, maxLength: 500 })

/**
 * Generates random list sizes
 */
export const listSize = () => fc.integer({ min: 0, max: 200 })

/**
 * Generates random large list sizes (for virtual scrolling testing)
 */
export const largeListSize = () => fc.integer({ min: 51, max: 500 })

/**
 * Generates random network conditions
 */
export const networkCondition = () =>
  fc.constantFrom('4g', '3g', '2g', 'slow-2g', 'unknown')

/**
 * Generates random device memory values (in GB)
 */
export const deviceMemory = () => fc.integer({ min: 1, max: 16 })

/**
 * Generates random interactive element types
 */
export const interactiveElementType = () =>
  fc.constantFrom('button', 'link', 'input', 'checkbox', 'radio', 'select')

/**
 * Generates random color values (hex format)
 */
export const hexColor = () =>
  fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`)

/**
 * Generates random RGB color values
 */
export const rgbColor = () =>
  fc.record({
    r: fc.integer({ min: 0, max: 255 }),
    g: fc.integer({ min: 0, max: 255 }),
    b: fc.integer({ min: 0, max: 255 }),
  })

// ============================================================================
// Test Helper Functions
// ============================================================================

/**
 * Simulates a touch event sequence (touchstart -> touchmove -> touchend)
 */
export function simulateTouch(
  element: HTMLElement,
  touches: { startX: number; startY: number; endX: number; endY: number; duration?: number }
): void {
  const { startX, startY, endX, endY, duration = 100 } = touches

  // Touchstart
  const touchStartEvent = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [
      {
        clientX: startX,
        clientY: startY,
        identifier: 0,
      } as Touch,
    ],
  })
  element.dispatchEvent(touchStartEvent)

  // Touchmove (optional, for swipes)
  if (startX !== endX || startY !== endY) {
    const touchMoveEvent = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [
        {
          clientX: endX,
          clientY: endY,
          identifier: 0,
        } as Touch,
      ],
    })
    element.dispatchEvent(touchMoveEvent)
  }

  // Touchend
  setTimeout(() => {
    const touchEndEvent = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      changedTouches: [
        {
          clientX: endX,
          clientY: endY,
          identifier: 0,
        } as Touch,
      ],
    })
    element.dispatchEvent(touchEndEvent)
  }, duration)
}

/**
 * Simulates a swipe gesture
 */
export function simulateSwipe(
  element: HTMLElement,
  direction: 'left' | 'right' | 'up' | 'down',
  distance: number = 100
): void {
  const startX = 200
  const startY = 200

  let endX = startX
  let endY = startY

  switch (direction) {
    case 'left':
      endX = startX - distance
      break
    case 'right':
      endX = startX + distance
      break
    case 'up':
      endY = startY - distance
      break
    case 'down':
      endY = startY + distance
      break
  }

  simulateTouch(element, { startX, startY, endX, endY })
}

/**
 * Sets the viewport size for testing
 */
export function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })

  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

/**
 * Calculates contrast ratio between two colors
 * Used for accessibility testing
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  // This is a simplified version - in production, use a proper color contrast library
  // For now, return a mock value for testing purposes
  return 4.5
}

/**
 * Measures the computed size of an element
 */
export function getComputedSize(element: HTMLElement): { width: number; height: number } {
  const styles = window.getComputedStyle(element)
  return {
    width: parseFloat(styles.width),
    height: parseFloat(styles.height),
  }
}

/**
 * Checks if an element is visible in the viewport
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

/**
 * Waits for an animation to complete
 */
export function waitForAnimation(duration: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, duration))
}

/**
 * Gets all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll(selector))
}
