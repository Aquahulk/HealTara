# Mobile Infrastructure Setup

This document describes the mobile infrastructure and utilities that have been set up for the Healtara mobile view enhancement.

## Overview

The mobile infrastructure provides foundational utilities, CSS configurations, and testing setup for building mobile-optimized features across the application.

## Components

### 1. Mobile Utility Library (`lib/mobile-utils.ts`)

A comprehensive utility library providing:

#### Device Detection
- `isMobileDevice()` - Checks if viewport width < 768px
- `isIOS()` - Detects iOS devices
- `isAndroid()` - Detects Android devices
- `isTouchDevice()` - Checks for touch support

#### Viewport Utilities
- `getViewportHeight()` - Gets accurate viewport height (accounts for mobile browser chrome)
- `getSafeAreaInsets()` - Returns safe area insets for iOS notch support

#### Touch Utilities
- `preventZoom(element)` - Prevents double-tap zoom on an element
- `enableMomentumScrolling(element)` - Enables iOS momentum scrolling
- `detectSwipe(touchStart, touchEnd, threshold)` - Detects swipe direction
- `isLongPress(touchStart, touchEnd, threshold)` - Checks if touch is a long press

#### Performance Utilities
- `lazyLoadImage(src)` - Lazy loads images
- `prefetchRoute(path)` - Prefetches Next.js routes
- `getNetworkType()` - Returns current network type (4g, 3g, 2g, etc.)
- `getDeviceMemory()` - Returns device memory in GB
- `getHardwareConcurrency()` - Returns number of logical processors
- `isSlowNetwork()` - Checks if on 2g or slow-2g
- `hasLimitedMemory()` - Checks if device has < 4GB memory

### 2. Tailwind CSS Mobile Extensions (`app/globals.css`)

Extended Tailwind CSS with mobile-specific utilities:

#### CSS Variables
- `--spacing-safe-top/bottom/left/right` - Safe area insets
- `--min-touch-target` - Minimum touch target size (44px)
- `--vh-mobile` - Mobile viewport height (accounts for browser chrome)

#### Utility Classes

**Touch Targets:**
- `.touch-target` - Ensures minimum 44x44px size
- `.prevent-zoom` - Prevents double-tap zoom
- `.touch-feedback` - Adds touch feedback animation

**Scrolling:**
- `.momentum-scroll` - Enables iOS momentum scrolling
- `.scrollbar-hide` - Hides scrollbar while keeping functionality
- `.horizontal-scroll` - Horizontal scroll container with snap points

**Layout:**
- `.mobile-card` - Mobile-optimized card styling
- `.mobile-modal-overlay` - Full-screen modal overlay
- `.mobile-modal-content` - Full-screen modal content
- `.mobile-bottom-sheet` - Bottom sheet modal

**Typography:**
- `.mobile-body-text` - 16px body text with 1.6 line height
- `.mobile-heading-1/2/3` - Responsive heading sizes
- `.mobile-input` - 48px height input with 16px font
- `.mobile-button` - 44px minimum touch target button

**Spacing:**
- `.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe` - Safe area padding
- `.p-safe` - All-sides safe area padding
- `.pb-bottom-nav` - 64px bottom padding for bottom navigation
- `.responsive-padding` - 16px horizontal padding on mobile

**Viewport:**
- `.h-screen-mobile` - Full mobile viewport height
- `.min-h-screen-mobile` - Minimum mobile viewport height

**Accessibility:**
- Focus states optimized for mobile
- Reduced motion support

### 3. Testing Infrastructure

#### Jest Configuration (`jest.config.js`)
- Configured for Next.js with jsdom environment
- 80% coverage threshold
- Module path mapping for `@/` imports

#### Jest Setup (`jest.setup.js`)
Mocks for mobile APIs:
- `window.matchMedia`
- `IntersectionObserver`
- `ResizeObserver`
- `window.visualViewport`
- `navigator.vibrate`
- `navigator.share`
- `navigator.geolocation`
- `navigator.connection`
- `navigator.deviceMemory`
- `navigator.maxTouchPoints`

Default mobile viewport: 375x667px

#### Test Utilities (`lib/test-utils.ts`)

**Property-Based Testing Configuration:**
- `propertyTestConfig` - Standard config (100 iterations)
- `expensivePropertyTestConfig` - Reduced config (20 iterations)

**Fast-Check Arbitraries:**
- `mobileViewportWidth()` - 320-767px
- `tabletViewportWidth()` - 768-1023px
- `desktopViewportWidth()` - 1024-1920px
- `viewportHeight()` - 568-1080px
- `touchCoordinate()` - Random touch coordinates
- `swipeGesture()` - Random swipe gestures
- `longPressGesture()` - Random long-press gestures
- `textContent()` - Random text (1-200 chars)
- `longTextContent()` - Random long text (100-500 chars)
- `listSize()` - Random list sizes (0-200)
- `largeListSize()` - Large lists (51-500)
- `networkCondition()` - Network types
- `deviceMemory()` - Device memory (1-16GB)
- `interactiveElementType()` - Button, link, input, etc.
- `hexColor()` - Random hex colors
- `rgbColor()` - Random RGB colors

**Test Helper Functions:**
- `simulateTouch()` - Simulates touch event sequence
- `simulateSwipe()` - Simulates swipe gesture
- `setViewportSize()` - Sets viewport dimensions
- `calculateContrastRatio()` - Calculates color contrast
- `getComputedSize()` - Gets element dimensions
- `isElementInViewport()` - Checks viewport visibility
- `waitForAnimation()` - Waits for animations
- `getFocusableElements()` - Gets all focusable elements

## Usage Examples

### Device Detection
```typescript
import { isMobileDevice, isIOS } from '@/lib/mobile-utils'

if (isMobileDevice()) {
  // Show mobile layout
}

if (isIOS()) {
  // Apply iOS-specific styles
}
```

### Touch Utilities
```typescript
import { detectSwipe, preventZoom } from '@/lib/mobile-utils'

const button = document.querySelector('button')
preventZoom(button)

element.addEventListener('touchstart', (e) => {
  const start = e.touches[0]
  element.addEventListener('touchend', (e) => {
    const end = e.changedTouches[0]
    const direction = detectSwipe(start, end)
    if (direction === 'left') {
      // Handle left swipe
    }
  })
})
```

### CSS Utilities
```tsx
// Touch-optimized button
<button className="touch-target touch-feedback mobile-button">
  Click Me
</button>

// Mobile card with safe area padding
<div className="mobile-card p-safe">
  Content
</div>

// Horizontal scroll container
<div className="horizontal-scroll">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Property-Based Testing
```typescript
import fc from 'fast-check'
import { propertyTestConfig, mobileViewportWidth } from '@/lib/test-utils'

it('Property: Touch targets are at least 44px', () => {
  fc.assert(
    fc.property(
      mobileViewportWidth(),
      (viewportWidth) => {
        // Feature: mobile-view-enhancement, Property 1: Touch Target Minimum Size
        setViewportSize(viewportWidth, 667)
        const { container } = render(<MyButton />)
        const button = container.querySelector('button')
        const { width, height } = getComputedSize(button)
        return width >= 44 && height >= 44
      }
    ),
    propertyTestConfig
  )
})
```

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm test:ci

# Run tests with coverage
npm test:coverage
```

## Test Coverage

Current coverage: 100% for mobile-utils.ts
- 25 passing unit tests
- All device detection, viewport, touch, and performance utilities tested

## Next Steps

This infrastructure is now ready for:
1. Building mobile hooks (useViewport, useTouchGesture, etc.)
2. Creating mobile components (MobileLayout, TouchFeedback, etc.)
3. Implementing mobile-specific features
4. Writing property-based tests for mobile behaviors

## Requirements Validated

This infrastructure setup validates the following requirements:
- **1.1**: Mobile-first responsive layout system foundation
- **1.3**: Viewport utilities for responsive breakpoints
- **2.1**: Touch target utilities (44px minimum)
- **2.6**: Touch feedback and interaction utilities

## Files Created

- `apps/web/lib/mobile-utils.ts` - Mobile utility library
- `apps/web/lib/test-utils.ts` - Testing utilities and arbitraries
- `apps/web/lib/__tests__/mobile-utils.test.ts` - Unit tests
- `apps/web/jest.config.js` - Jest configuration
- `apps/web/jest.setup.js` - Jest setup with mocks
- `apps/web/app/globals.css` - Extended with mobile utilities

## Files Modified

- `apps/web/package.json` - Added testing dependencies and scripts
