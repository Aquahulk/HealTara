/**
 * Tests for useViewport hook
 */

import { renderHook, act } from '@testing-library/react';
import { useViewport } from '../useViewport';
import * as mobileUtils from '@/lib/mobile-utils';

// Mock the mobile-utils module
jest.mock('@/lib/mobile-utils', () => ({
  getViewportHeight: jest.fn(),
  getSafeAreaInsets: jest.fn(),
}));

describe('useViewport', () => {
  const mockGetViewportHeight = mobileUtils.getViewportHeight as jest.MockedFunction<typeof mobileUtils.getViewportHeight>;
  const mockGetSafeAreaInsets = mobileUtils.getSafeAreaInsets as jest.MockedFunction<typeof mobileUtils.getSafeAreaInsets>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    mockGetViewportHeight.mockReturnValue(800);
    mockGetSafeAreaInsets.mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  afterEach(() => {
    // Clean up any event listeners
    jest.restoreAllMocks();
  });

  describe('initial viewport detection', () => {
    it('should detect mobile viewport (< 768px)', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.width).toBe(375);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should detect tablet viewport (768px - 1024px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.width).toBe(800);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should detect desktop viewport (>= 1024px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.width).toBe(1280);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('orientation detection', () => {
    it('should detect portrait orientation (width < height)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      mockGetViewportHeight.mockReturnValue(667);

      const { result } = renderHook(() => useViewport());

      expect(result.current.orientation).toBe('portrait');
    });

    it('should detect landscape orientation (width >= height)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667,
      });
      mockGetViewportHeight.mockReturnValue(375);

      const { result } = renderHook(() => useViewport());

      expect(result.current.orientation).toBe('landscape');
    });
  });

  describe('safe area insets', () => {
    it('should return safe area insets from mobile-utils', () => {
      const mockInsets = { top: 44, right: 0, bottom: 34, left: 0 };
      mockGetSafeAreaInsets.mockReturnValue(mockInsets);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.safeAreaInsets).toEqual(mockInsets);
    });
  });

  describe('resize event handling', () => {
    it('should update viewport info on window resize', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(true);

      // Change window width to desktop size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.width).toBe(1280);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });

    it('should update device type when crossing breakpoints', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(true);

      // Cross mobile-tablet breakpoint
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
    });
  });

  describe('orientation change handling', () => {
    it('should update viewport info on orientation change', async () => {
      jest.useFakeTimers();

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      mockGetViewportHeight.mockReturnValue(667);

      const { result } = renderHook(() => useViewport());

      expect(result.current.orientation).toBe('portrait');

      // Simulate orientation change to landscape
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667,
      });
      mockGetViewportHeight.mockReturnValue(375);

      act(() => {
        window.dispatchEvent(new Event('orientationchange'));
        jest.advanceTimersByTime(100);
      });

      expect(result.current.orientation).toBe('landscape');

      jest.useRealTimers();
    });
  });

  describe('viewport height calculation', () => {
    it('should use getViewportHeight for accurate height', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      mockGetViewportHeight.mockReturnValue(667);

      const { result } = renderHook(() => useViewport());

      expect(result.current.height).toBe(667);
      expect(mockGetViewportHeight).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 768px as tablet', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should handle exactly 1024px as desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });

    it('should handle very small viewports (320px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.width).toBe(320);
      expect(result.current.isMobile).toBe(true);
    });

    it('should handle very large viewports (2560px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 2560,
      });

      const { result } = renderHook(() => useViewport());

      expect(result.current.width).toBe(2560);
      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useViewport());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    });
  });
});
