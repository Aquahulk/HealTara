// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock visualViewport
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  value: {
    height: 667,
    width: 375,
    scale: 1,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
})

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
})

// Mock navigator.share
Object.defineProperty(navigator, 'share', {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined),
})

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
})

// Mock navigator.connection
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
})

// Mock navigator.maxTouchPoints for touch device detection
Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  value: 5,
})

// Set default viewport size for mobile testing
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 375,
})

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  value: 667,
})

// Mock navigator.deviceMemory
Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  value: 8,
})

// Mock performance.getEntriesByType for useMobilePerformance hook
if (!performance.getEntriesByType) {
  performance.getEntriesByType = jest.fn().mockReturnValue([])
}

// Mock PerformanceObserver
global.PerformanceObserver = class PerformanceObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
