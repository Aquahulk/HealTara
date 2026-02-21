/**
 * Unit tests for useMobilePerformance hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMobilePerformance } from '../useMobilePerformance';
import * as mobileUtils from '@/lib/mobile-utils';

// Mock mobile-utils
jest.mock('@/lib/mobile-utils', () => ({
  getNetworkType: jest.fn(() => '4g'),
  getDeviceMemory: jest.fn(() => 8),
  getHardwareConcurrency: jest.fn(() => 4),
}));

describe('useMobilePerformance', () => {
  let mockPerformanceObserver: jest.Mock;
  let mockObserverInstances: any[];

  beforeEach(() => {
    mockObserverInstances = [];
    
    // Mock PerformanceObserver
    mockPerformanceObserver = jest.fn((callback) => {
      const instance = {
        observe: jest.fn(),
        disconnect: jest.fn(),
        callback,
      };
      mockObserverInstances.push(instance);
      return instance;
    });

    global.PerformanceObserver = mockPerformanceObserver as any;

    // Mock performance.getEntriesByType for TTFB
    global.performance.getEntriesByType = jest.fn((type: string) => {
      if (type === 'navigation') {
        return [{
          requestStart: 100,
          responseStart: 250,
        }] as any;
      }
      return [];
    });

    // Mock performance.mark
    global.performance.mark = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default metrics', () => {
    const { result } = renderHook(() => useMobilePerformance());

    expect(result.current.metrics).toEqual({
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 150, // TTFB is calculated immediately from navigation timing
      networkType: '4g',
      deviceMemory: 8,
      hardwareConcurrency: 4,
    });
  });

  it('measures TTFB on mount', () => {
    const { result } = renderHook(() => useMobilePerformance());

    // TTFB should be calculated from navigation timing
    expect(result.current.metrics.ttfb).toBe(150); // 250 - 100
  });

  it('tracks First Contentful Paint (FCP)', async () => {
    const { result } = renderHook(() => useMobilePerformance());

    // Find the FCP observer
    const fcpObserver = mockObserverInstances.find(
      (obs) => obs.observe.mock.calls[0]?.[0]?.type === 'paint'
    );

    expect(fcpObserver).toBeDefined();

    // Simulate FCP entry
    act(() => {
      fcpObserver.callback({
        getEntries: () => [
          {
            name: 'first-contentful-paint',
            startTime: 1200,
          },
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.metrics.fcp).toBe(1200);
    });
  });

  it('tracks Largest Contentful Paint (LCP)', async () => {
    const { result } = renderHook(() => useMobilePerformance());

    // Find the LCP observer
    const lcpObserver = mockObserverInstances.find(
      (obs) => obs.observe.mock.calls[0]?.[0]?.type === 'largest-contentful-paint'
    );

    expect(lcpObserver).toBeDefined();

    // Simulate LCP entries (LCP can update multiple times)
    act(() => {
      lcpObserver.callback({
        getEntries: () => [
          { startTime: 1500 },
          { startTime: 2000 },
          { startTime: 2500 },
        ],
      });
    });

    await waitFor(() => {
      // Should use the last entry
      expect(result.current.metrics.lcp).toBe(2500);
    });
  });

  it('tracks First Input Delay (FID)', async () => {
    const { result } = renderHook(() => useMobilePerformance());

    // Find the FID observer
    const fidObserver = mockObserverInstances.find(
      (obs) => obs.observe.mock.calls[0]?.[0]?.type === 'first-input'
    );

    expect(fidObserver).toBeDefined();

    // Simulate FID entry
    act(() => {
      fidObserver.callback({
        getEntries: () => [
          {
            startTime: 1000,
            processingStart: 1050,
          },
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.metrics.fid).toBe(50); // 1050 - 1000
    });
  });

  it('tracks Cumulative Layout Shift (CLS)', async () => {
    const { result } = renderHook(() => useMobilePerformance());

    // Find the CLS observer
    const clsObserver = mockObserverInstances.find(
      (obs) => obs.observe.mock.calls[0]?.[0]?.type === 'layout-shift'
    );

    expect(clsObserver).toBeDefined();

    // Simulate multiple layout shift entries
    act(() => {
      clsObserver.callback({
        getEntries: () => [
          { value: 0.05, hadRecentInput: false },
          { value: 0.03, hadRecentInput: false },
          { value: 0.10, hadRecentInput: true }, // Should be ignored
        ],
      });
    });

    await waitFor(() => {
      // Should sum only shifts without recent input
      expect(result.current.metrics.cls).toBe(0.08); // 0.05 + 0.03
    });
  });

  it('ignores layout shifts with recent user input', async () => {
    const { result } = renderHook(() => useMobilePerformance());

    const clsObserver = mockObserverInstances.find(
      (obs) => obs.observe.mock.calls[0]?.[0]?.type === 'layout-shift'
    );

    act(() => {
      clsObserver.callback({
        getEntries: () => [
          { value: 0.05, hadRecentInput: true },
          { value: 0.03, hadRecentInput: true },
        ],
      });
    });

    await waitFor(() => {
      // CLS should remain 0 since all shifts had recent input
      expect(result.current.metrics.cls).toBe(0);
    });
  });

  it('includes device capabilities in metrics', () => {
    const { result } = renderHook(() => useMobilePerformance());

    expect(result.current.metrics.networkType).toBe('4g');
    expect(result.current.metrics.deviceMemory).toBe(8);
    expect(result.current.metrics.hardwareConcurrency).toBe(4);
  });

  it('updates network type periodically', async () => {
    jest.useFakeTimers();
    
    // Re-mock performance.getEntriesByType for fake timers
    global.performance.getEntriesByType = jest.fn((type: string) => {
      if (type === 'navigation') {
        return [{
          requestStart: 100,
          responseStart: 250,
        }] as any;
      }
      return [];
    });
    
    const { result } = renderHook(() => useMobilePerformance());

    expect(result.current.metrics.networkType).toBe('4g');

    // Change network type
    (mobileUtils.getNetworkType as jest.Mock).mockReturnValue('3g');

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.metrics.networkType).toBe('3g');
    });

    jest.useRealTimers();
  });

  it('provides reportMetric function', () => {
    const { result } = renderHook(() => useMobilePerformance());

    expect(typeof result.current.reportMetric).toBe('function');
  });

  it('reportMetric creates performance marks', () => {
    const { result } = renderHook(() => useMobilePerformance());

    act(() => {
      result.current.reportMetric('custom-metric', 1500);
    });

    expect(performance.mark).toHaveBeenCalledWith('custom-metric');
  });

  it('reportMetric handles errors gracefully', () => {
    const { result } = renderHook(() => useMobilePerformance());

    // Mock performance.mark to throw error
    (performance.mark as jest.Mock).mockImplementation(() => {
      throw new Error('Performance API error');
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    act(() => {
      result.current.reportMetric('failing-metric', 1000);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to report metric:',
      'failing-metric',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it('disconnects observers on unmount', () => {
    const { unmount } = renderHook(() => useMobilePerformance());

    unmount();

    // All observers should be disconnected
    mockObserverInstances.forEach((observer) => {
      expect(observer.disconnect).toHaveBeenCalled();
    });
  });

  it('handles missing PerformanceObserver gracefully', () => {
    // Remove PerformanceObserver
    const originalPO = global.PerformanceObserver;
    const originalGetEntriesByType = global.performance.getEntriesByType;
    
    (global as any).PerformanceObserver = undefined;
    global.performance.getEntriesByType = jest.fn(() => []);

    const { result } = renderHook(() => useMobilePerformance());

    // Should still return metrics with defaults
    expect(result.current.metrics).toBeDefined();
    expect(result.current.metrics.fcp).toBe(0);

    // Restore
    global.PerformanceObserver = originalPO;
    global.performance.getEntriesByType = originalGetEntriesByType;
  });

  it('handles server-side rendering', () => {
    // Mock window as undefined
    const originalWindow = global.window;
    (global as any).window = undefined;

    const { result } = renderHook(() => useMobilePerformance());

    // Should return default metrics
    expect(result.current.metrics).toBeDefined();
    expect(result.current.reportMetric).toBeDefined();

    // Restore
    global.window = originalWindow;
  });
});
