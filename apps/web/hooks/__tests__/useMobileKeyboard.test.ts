/**
 * Tests for useMobileKeyboard hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMobileKeyboard } from '../useMobileKeyboard';

describe('useMobileKeyboard', () => {
  let mockVisualViewport: any;
  let originalVisualViewport: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Store original visualViewport
    originalVisualViewport = window.visualViewport;

    // Mock visualViewport API
    mockVisualViewport = {
      height: 800,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Delete and redefine visualViewport
    delete (window as any).visualViewport;
    (window as any).visualViewport = mockVisualViewport;

    // Mock innerHeight
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    
    // Restore original visualViewport
    delete (window as any).visualViewport;
    if (originalVisualViewport) {
      (window as any).visualViewport = originalVisualViewport;
    }
  });

  describe('initial state', () => {
    it('should initialize with keyboard closed', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      expect(result.current.isKeyboardOpen).toBe(false);
      expect(result.current.keyboardHeight).toBe(0);
    });

    it('should provide scrollToInput function', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      expect(result.current.scrollToInput).toBeInstanceOf(Function);
    });
  });

  describe('keyboard detection using visualViewport', () => {
    it('should detect keyboard open when viewport height decreases by more than 150px', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      expect(result.current.isKeyboardOpen).toBe(false);

      // Simulate keyboard opening (viewport height decreases)
      mockVisualViewport.height = 500; // 300px decrease

      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.isKeyboardOpen).toBe(true);
      expect(result.current.keyboardHeight).toBe(300);
    });

    it('should not detect keyboard open for small viewport changes (< 150px)', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // Simulate small viewport change (browser chrome)
      mockVisualViewport.height = 700; // 100px decrease

      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.isKeyboardOpen).toBe(false);
      expect(result.current.keyboardHeight).toBe(0);
    });

    it('should detect keyboard close when viewport height returns to original', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // Open keyboard
      mockVisualViewport.height = 500;
      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.isKeyboardOpen).toBe(true);

      // Close keyboard
      mockVisualViewport.height = 800;
      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.isKeyboardOpen).toBe(false);
      expect(result.current.keyboardHeight).toBe(0);
    });

    it('should register both resize and scroll listeners on visualViewport', () => {
      renderHook(() => useMobileKeyboard());

      expect(mockVisualViewport.addEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      expect(mockVisualViewport.addEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
    });
  });

  describe('keyboard detection fallback (no visualViewport)', () => {
    it('should work when visualViewport is not available', () => {
      // Remove visualViewport support before rendering
      delete (window as any).visualViewport;
      
      const { result } = renderHook(() => useMobileKeyboard());

      // Should initialize without errors
      expect(result.current.isKeyboardOpen).toBe(false);
      expect(result.current.keyboardHeight).toBe(0);
      expect(result.current.scrollToInput).toBeInstanceOf(Function);
    });
  });

  describe('scrollToInput function', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      mockElement = document.createElement('input');
      mockElement.scrollIntoView = jest.fn();

      // Mock getBoundingClientRect
      jest.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
        top: 600,
        bottom: 650,
        left: 0,
        right: 100,
        width: 100,
        height: 50,
        x: 0,
        y: 600,
        toJSON: () => ({}),
      });
    });

    it('should scroll element into view when hidden by keyboard', async () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // Element bottom (650) > viewport height (500) = hidden by keyboard
      mockVisualViewport.height = 500;

      act(() => {
        result.current.scrollToInput(mockElement);
      });

      // Fast-forward past the timeout
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      });
    });

    it('should not scroll if element is already visible', async () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // Element bottom (650) < viewport height (800) = visible
      mockVisualViewport.height = 800;

      act(() => {
        result.current.scrollToInput(mockElement);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockElement.scrollIntoView).not.toHaveBeenCalled();
    });

    it('should handle null element gracefully', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      expect(() => {
        result.current.scrollToInput(null as any);
      }).not.toThrow();
    });

    it('should wait 300ms before scrolling (keyboard animation)', async () => {
      const { result } = renderHook(() => useMobileKeyboard());

      mockVisualViewport.height = 500;

      act(() => {
        result.current.scrollToInput(mockElement);
      });

      // Should not scroll immediately
      expect(mockElement.scrollIntoView).not.toHaveBeenCalled();

      // Should scroll after 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockElement.scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('keyboard height calculation', () => {
    it('should calculate correct keyboard height', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // Initial height: 800, keyboard opens to 450
      mockVisualViewport.height = 450;

      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.keyboardHeight).toBe(350);
    });

    it('should reset keyboard height to 0 when keyboard closes', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // Open keyboard
      mockVisualViewport.height = 450;
      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.keyboardHeight).toBe(350);

      // Close keyboard
      mockVisualViewport.height = 800;
      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.keyboardHeight).toBe(0);
    });

    it('should handle various keyboard heights', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      const testCases = [
        { newHeight: 600, expectedKeyboardHeight: 200 },
        { newHeight: 500, expectedKeyboardHeight: 300 },
        { newHeight: 400, expectedKeyboardHeight: 400 },
        { newHeight: 300, expectedKeyboardHeight: 500 },
      ];

      testCases.forEach(({ newHeight, expectedKeyboardHeight }) => {
        mockVisualViewport.height = newHeight;

        act(() => {
          const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
            (call: any) => call[0] === 'resize'
          )?.[1];
          resizeHandler?.();
        });

        expect(result.current.keyboardHeight).toBe(expectedKeyboardHeight);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 150px threshold', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // Exactly 150px decrease - should not trigger
      mockVisualViewport.height = 650;

      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.isKeyboardOpen).toBe(false);
    });

    it('should handle 151px threshold', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // 151px decrease - should trigger
      mockVisualViewport.height = 649;

      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.isKeyboardOpen).toBe(true);
    });

    it('should handle viewport height increase (should not affect keyboard state)', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // Viewport increases (shouldn't happen with keyboard, but test anyway)
      mockVisualViewport.height = 900;

      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });

      expect(result.current.isKeyboardOpen).toBe(false);
      expect(result.current.keyboardHeight).toBe(0);
    });

    it('should handle rapid keyboard open/close cycles', () => {
      const { result } = renderHook(() => useMobileKeyboard());

      // Open
      mockVisualViewport.height = 500;
      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });
      expect(result.current.isKeyboardOpen).toBe(true);

      // Close
      mockVisualViewport.height = 800;
      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });
      expect(result.current.isKeyboardOpen).toBe(false);

      // Open again
      mockVisualViewport.height = 450;
      act(() => {
        const resizeHandler = mockVisualViewport.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'resize'
        )?.[1];
        resizeHandler?.();
      });
      expect(result.current.isKeyboardOpen).toBe(true);
      expect(result.current.keyboardHeight).toBe(350);
    });
  });

  describe('cleanup', () => {
    it('should remove visualViewport event listeners on unmount', () => {
      const { unmount } = renderHook(() => useMobileKeyboard());

      unmount();

      expect(mockVisualViewport.removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      expect(mockVisualViewport.removeEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
    });

    it('should cleanup event listeners on unmount (fallback mode)', () => {
      // Remove visualViewport support before rendering
      delete (window as any).visualViewport;

      const { unmount } = renderHook(() => useMobileKeyboard());

      // Just verify unmount doesn't throw
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('SSR compatibility', () => {
    it('should handle server-side rendering gracefully', () => {
      // The hook should handle SSR by checking typeof window !== 'undefined'
      // We can't truly test SSR in jsdom, but we can verify the hook doesn't crash
      // when visualViewport is undefined
      delete (window as any).visualViewport;
      
      expect(() => {
        renderHook(() => useMobileKeyboard());
      }).not.toThrow();
    });
  });
});
