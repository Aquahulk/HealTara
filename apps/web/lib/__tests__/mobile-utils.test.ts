/**
 * Unit tests for mobile utility functions
 */

import {
  isMobileDevice,
  isIOS,
  isAndroid,
  isTouchDevice,
  getViewportHeight,
  getSafeAreaInsets,
  preventZoom,
  enableMomentumScrolling,
  detectSwipe,
  isLongPress,
  getNetworkType,
  getDeviceMemory,
  getHardwareConcurrency,
  isSlowNetwork,
  hasLimitedMemory,
} from '../mobile-utils'

describe('Mobile Utils - Device Detection', () => {
  beforeEach(() => {
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
  })

  describe('isMobileDevice', () => {
    it('returns true for viewport width < 768px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 767 })
      expect(isMobileDevice()).toBe(true)
    })

    it('returns false for viewport width >= 768px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      expect(isMobileDevice()).toBe(false)
    })
  })

  describe('isIOS', () => {
    it('returns true for iOS user agents', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      })
      expect(isIOS()).toBe(true)
    })

    it('returns false for non-iOS user agents', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10)',
        configurable: true,
      })
      expect(isIOS()).toBe(false)
    })
  })

  describe('isAndroid', () => {
    it('returns true for Android user agents', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10)',
        configurable: true,
      })
      expect(isAndroid()).toBe(true)
    })

    it('returns false for non-Android user agents', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      })
      expect(isAndroid()).toBe(false)
    })
  })

  describe('isTouchDevice', () => {
    it('returns true when touch events are supported', () => {
      // maxTouchPoints is mocked in jest.setup.js
      expect(isTouchDevice()).toBe(true)
    })
  })
})

describe('Mobile Utils - Viewport Utilities', () => {
  describe('getViewportHeight', () => {
    it('returns visualViewport height when available', () => {
      expect(getViewportHeight()).toBe(667) // Mocked in jest.setup.js
    })

    // Note: Cannot test fallback in Jest as visualViewport cannot be redefined
  })

  describe('getSafeAreaInsets', () => {
    it('returns safe area insets', () => {
      const insets = getSafeAreaInsets()
      expect(insets).toHaveProperty('top')
      expect(insets).toHaveProperty('right')
      expect(insets).toHaveProperty('bottom')
      expect(insets).toHaveProperty('left')
    })
  })
})

describe('Mobile Utils - Touch Utilities', () => {
  describe('preventZoom', () => {
    it('sets touch-action to manipulation', () => {
      const element = document.createElement('button')
      preventZoom(element)
      expect(element.style.touchAction).toBe('manipulation')
    })
  })

  describe('enableMomentumScrolling', () => {
    it('enables momentum scrolling on element', () => {
      const element = document.createElement('div')
      enableMomentumScrolling(element)
      expect(element.style.webkitOverflowScrolling).toBe('touch')
      expect(element.style.overflowY).toBe('auto')
    })
  })

  describe('detectSwipe', () => {
    it('detects left swipe', () => {
      const touchStart = { clientX: 200, clientY: 100 } as Touch
      const touchEnd = { clientX: 100, clientY: 100 } as Touch
      expect(detectSwipe(touchStart, touchEnd)).toBe('left')
    })

    it('detects right swipe', () => {
      const touchStart = { clientX: 100, clientY: 100 } as Touch
      const touchEnd = { clientX: 200, clientY: 100 } as Touch
      expect(detectSwipe(touchStart, touchEnd)).toBe('right')
    })

    it('detects up swipe', () => {
      const touchStart = { clientX: 100, clientY: 200 } as Touch
      const touchEnd = { clientX: 100, clientY: 100 } as Touch
      expect(detectSwipe(touchStart, touchEnd)).toBe('up')
    })

    it('detects down swipe', () => {
      const touchStart = { clientX: 100, clientY: 100 } as Touch
      const touchEnd = { clientX: 100, clientY: 200 } as Touch
      expect(detectSwipe(touchStart, touchEnd)).toBe('down')
    })

    it('returns null for movement below threshold', () => {
      const touchStart = { clientX: 100, clientY: 100 } as Touch
      const touchEnd = { clientX: 120, clientY: 100 } as Touch
      expect(detectSwipe(touchStart, touchEnd)).toBe(null)
    })

    it('respects custom threshold', () => {
      const touchStart = { clientX: 100, clientY: 100 } as Touch
      const touchEnd = { clientX: 180, clientY: 100 } as Touch
      expect(detectSwipe(touchStart, touchEnd, 100)).toBe(null)
    })
  })

  describe('isLongPress', () => {
    it('returns true for duration >= 500ms', () => {
      const start = Date.now()
      const end = start + 600
      expect(isLongPress(start, end)).toBe(true)
    })

    it('returns false for duration < 500ms', () => {
      const start = Date.now()
      const end = start + 400
      expect(isLongPress(start, end)).toBe(false)
    })

    it('respects custom threshold', () => {
      const start = Date.now()
      const end = start + 400
      expect(isLongPress(start, end, 300)).toBe(true)
    })
  })
})

describe('Mobile Utils - Performance Utilities', () => {
  describe('getNetworkType', () => {
    it('returns network type from connection API', () => {
      expect(getNetworkType()).toBe('4g') // Mocked in jest.setup.js
    })
  })

  describe('getDeviceMemory', () => {
    it('returns device memory', () => {
      expect(getDeviceMemory()).toBe(8) // Mocked in jest.setup.js
    })
  })

  describe('getHardwareConcurrency', () => {
    it('returns hardware concurrency', () => {
      expect(getHardwareConcurrency()).toBeGreaterThan(0)
    })
  })

  describe('isSlowNetwork', () => {
    it('returns false for 4g network', () => {
      expect(isSlowNetwork()).toBe(false)
    })

    // Note: Cannot test 2g network in Jest as navigator.connection cannot be redefined
  })

  describe('hasLimitedMemory', () => {
    it('returns false for 8GB memory', () => {
      expect(hasLimitedMemory()).toBe(false)
    })

    // Note: Cannot test limited memory in Jest as navigator.deviceMemory cannot be redefined
  })
})
