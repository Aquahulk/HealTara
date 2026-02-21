/**
 * Unit tests for MobileContext
 */

import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import { MobileProvider, useMobile } from '../MobileContext';

// Mock the hooks
jest.mock('@/hooks/useViewport', () => ({
  useViewport: jest.fn(() => ({
    width: 375,
    height: 667,
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    orientation: 'portrait',
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  })),
}));

jest.mock('@/hooks/useMobilePerformance', () => ({
  useMobilePerformance: jest.fn(() => ({
    metrics: {
      fcp: 1200,
      lcp: 1800,
      fid: 50,
      cls: 0.05,
      ttfb: 300,
      networkType: '4g',
      deviceMemory: 8,
      hardwareConcurrency: 4,
    },
    reportMetric: jest.fn(),
  })),
}));

describe('MobileContext', () => {
  describe('MobileProvider', () => {
    it('renders children correctly', () => {
      render(
        <MobileProvider>
          <div data-testid="child">Test Child</div>
        </MobileProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('provides viewport information from useViewport hook', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(result.current.viewport).toEqual({
        width: 375,
        height: 667,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        orientation: 'portrait',
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    });

    it('provides performance metrics from useMobilePerformance hook', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(result.current.performanceMetrics).toEqual({
        fcp: 1200,
        lcp: 1800,
        fid: 50,
        cls: 0.05,
        ttfb: 300,
        networkType: '4g',
        deviceMemory: 8,
        hardwareConcurrency: 4,
      });
    });

    it('initializes bottom nav visibility to true', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(result.current.isBottomNavVisible).toBe(true);
    });

    it('initializes hamburger menu state to false', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(result.current.isHamburgerMenuOpen).toBe(false);
    });

    it('allows updating bottom nav visibility', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(result.current.isBottomNavVisible).toBe(true);

      act(() => {
        result.current.setBottomNavVisible(false);
      });

      expect(result.current.isBottomNavVisible).toBe(false);

      act(() => {
        result.current.setBottomNavVisible(true);
      });

      expect(result.current.isBottomNavVisible).toBe(true);
    });

    it('allows updating hamburger menu state', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(result.current.isHamburgerMenuOpen).toBe(false);

      act(() => {
        result.current.setHamburgerMenuOpen(true);
      });

      expect(result.current.isHamburgerMenuOpen).toBe(true);

      act(() => {
        result.current.setHamburgerMenuOpen(false);
      });

      expect(result.current.isHamburgerMenuOpen).toBe(false);
    });
  });

  describe('useMobile hook', () => {
    it('throws error when used outside MobileProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useMobile());
      }).toThrow('useMobile must be used within a MobileProvider');

      console.error = originalError;
    });

    it('returns context value when used within MobileProvider', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(result.current).toHaveProperty('viewport');
      expect(result.current).toHaveProperty('isBottomNavVisible');
      expect(result.current).toHaveProperty('setBottomNavVisible');
      expect(result.current).toHaveProperty('isHamburgerMenuOpen');
      expect(result.current).toHaveProperty('setHamburgerMenuOpen');
      expect(result.current).toHaveProperty('performanceMetrics');
    });

    it('provides functions for state updates', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(typeof result.current.setBottomNavVisible).toBe('function');
      expect(typeof result.current.setHamburgerMenuOpen).toBe('function');
    });
  });

  describe('Integration with hooks', () => {
    it('integrates with useViewport for mobile detection', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(result.current.viewport.isMobile).toBe(true);
      expect(result.current.viewport.width).toBe(375);
    });

    it('integrates with useMobilePerformance for metrics', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      expect(result.current.performanceMetrics.fcp).toBe(1200);
      expect(result.current.performanceMetrics.networkType).toBe('4g');
    });
  });

  describe('State management', () => {
    it('maintains independent state for bottom nav and hamburger menu', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      act(() => {
        result.current.setBottomNavVisible(false);
        result.current.setHamburgerMenuOpen(true);
      });

      expect(result.current.isBottomNavVisible).toBe(false);
      expect(result.current.isHamburgerMenuOpen).toBe(true);
    });

    it('allows toggling states multiple times', () => {
      const { result } = renderHook(() => useMobile(), {
        wrapper: MobileProvider,
      });

      // Toggle bottom nav
      act(() => {
        result.current.setBottomNavVisible(false);
      });
      expect(result.current.isBottomNavVisible).toBe(false);

      act(() => {
        result.current.setBottomNavVisible(true);
      });
      expect(result.current.isBottomNavVisible).toBe(true);

      // Toggle hamburger menu
      act(() => {
        result.current.setHamburgerMenuOpen(true);
      });
      expect(result.current.isHamburgerMenuOpen).toBe(true);

      act(() => {
        result.current.setHamburgerMenuOpen(false);
      });
      expect(result.current.isHamburgerMenuOpen).toBe(false);
    });
  });
});
