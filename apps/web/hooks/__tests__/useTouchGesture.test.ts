/**
 * Tests for useTouchGesture hook
 */

import { renderHook, act } from '@testing-library/react';
import { useTouchGesture } from '../useTouchGesture';
import * as mobileUtils from '@/lib/mobile-utils';

// Mock the mobile-utils module
jest.mock('@/lib/mobile-utils', () => ({
  detectSwipe: jest.fn(),
  isLongPress: jest.fn(),
}));

describe('useTouchGesture', () => {
  const mockDetectSwipe = mobileUtils.detectSwipe as jest.MockedFunction<typeof mobileUtils.detectSwipe>;
  const mockIsLongPress = mobileUtils.isLongPress as jest.MockedFunction<typeof mobileUtils.isLongPress>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should return initial gesture state', () => {
      const { result } = renderHook(() => useTouchGesture());

      expect(result.current.state).toEqual({
        currentGesture: 'none',
        swipeDirection: null,
        isLongPressing: false,
        pinchScale: 1,
      });
    });

    it('should return touch event handlers', () => {
      const { result } = renderHook(() => useTouchGesture());

      expect(result.current.onTouchStart).toBeInstanceOf(Function);
      expect(result.current.onTouchMove).toBeInstanceOf(Function);
      expect(result.current.onTouchEnd).toBeInstanceOf(Function);
    });
  });

  describe('swipe detection', () => {
    it('should detect swipe left', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ onSwipeLeft }));

      mockDetectSwipe.mockReturnValue('left');

      const touchStart = {
        touches: [{ clientX: 200, clientY: 100 }],
      } as any;

      const touchEnd = {
        changedTouches: [{ clientX: 100, clientY: 100 }],
        touches: [],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
        result.current.onTouchEnd(touchEnd);
      });

      expect(onSwipeLeft).toHaveBeenCalled();
    });

    it('should detect swipe right', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ onSwipeRight }));

      mockDetectSwipe.mockReturnValue('right');

      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      const touchEnd = {
        changedTouches: [{ clientX: 200, clientY: 100 }],
        touches: [],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
        result.current.onTouchEnd(touchEnd);
      });

      expect(onSwipeRight).toHaveBeenCalled();
    });

    it('should detect swipe up', () => {
      const onSwipeUp = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ onSwipeUp }));

      mockDetectSwipe.mockReturnValue('up');

      const touchStart = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as any;

      const touchEnd = {
        changedTouches: [{ clientX: 100, clientY: 100 }],
        touches: [],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
        result.current.onTouchEnd(touchEnd);
      });

      expect(onSwipeUp).toHaveBeenCalled();
    });

    it('should detect swipe down', () => {
      const onSwipeDown = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ onSwipeDown }));

      mockDetectSwipe.mockReturnValue('down');

      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      const touchEnd = {
        changedTouches: [{ clientX: 100, clientY: 200 }],
        touches: [],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
        result.current.onTouchEnd(touchEnd);
      });

      expect(onSwipeDown).toHaveBeenCalled();
    });

    it('should update state during swipe move', () => {
      const { result } = renderHook(() => useTouchGesture());

      mockDetectSwipe.mockReturnValue('left');

      const touchStart = {
        touches: [{ clientX: 200, clientY: 100 }],
      } as any;

      const touchMove = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        result.current.onTouchMove(touchMove);
      });

      expect(result.current.state.currentGesture).toBe('swipe');
      expect(result.current.state.swipeDirection).toBe('left');
    });

    it('should use custom swipe threshold', () => {
      const { result } = renderHook(() => useTouchGesture({ swipeThreshold: 100 }));

      const touchStart = {
        touches: [{ clientX: 200, clientY: 100 }],
      } as any;

      const touchEnd = {
        changedTouches: [{ clientX: 150, clientY: 100 }],
        touches: [],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
        result.current.onTouchEnd(touchEnd);
      });

      expect(mockDetectSwipe).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        100
      );
    });
  });

  describe('long press detection', () => {
    it('should detect long press after threshold', () => {
      const onLongPress = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ onLongPress, longPressThreshold: 500 }));

      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
      });

      expect(result.current.state.isLongPressing).toBe(false);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.state.isLongPressing).toBe(true);
      expect(result.current.state.currentGesture).toBe('longpress');
      expect(onLongPress).toHaveBeenCalled();
    });

    it('should cancel long press on touch move', () => {
      const onLongPress = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ onLongPress, longPressThreshold: 500 }));

      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      const touchMove = {
        touches: [{ clientX: 150, clientY: 100 }],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onTouchMove(touchMove);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onLongPress).not.toHaveBeenCalled();
      expect(result.current.state.isLongPressing).toBe(false);
    });

    it('should cancel long press on touch end before threshold', () => {
      const onLongPress = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ onLongPress, longPressThreshold: 500 }));

      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      const touchEnd = {
        changedTouches: [{ clientX: 100, clientY: 100 }],
        touches: [],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onTouchEnd(touchEnd);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('should use custom long press threshold', () => {
      const onLongPress = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ onLongPress, longPressThreshold: 1000 }));

      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onLongPress).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onLongPress).toHaveBeenCalled();
    });
  });

  describe('pinch-to-zoom detection', () => {
    it('should detect pinch gesture with two touches', () => {
      const onPinchZoom = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ enablePinchZoom: true, onPinchZoom }));

      const touchStart = {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
      });

      expect(result.current.state.currentGesture).toBe('pinch');
      expect(result.current.state.pinchScale).toBe(1);
    });

    it('should calculate pinch scale on touch move', () => {
      const onPinchZoom = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ enablePinchZoom: true, onPinchZoom }));

      const touchStart = {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as any;

      const touchMove = {
        touches: [
          { clientX: 50, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        result.current.onTouchMove(touchMove);
      });

      // Initial distance: 100px, new distance: 200px, scale: 2
      expect(result.current.state.pinchScale).toBe(2);
      expect(onPinchZoom).toHaveBeenCalledWith(2);
    });

    it('should not detect pinch when disabled', () => {
      const onPinchZoom = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ enablePinchZoom: false, onPinchZoom }));

      const touchStart = {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
      });

      expect(result.current.state.currentGesture).toBe('none');
      expect(onPinchZoom).not.toHaveBeenCalled();
    });

    it('should cancel long press when pinch starts', () => {
      const onLongPress = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ enablePinchZoom: true, onLongPress }));

      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
      });

      const pinchStart = {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as any;

      act(() => {
        result.current.onTouchStart(pinchStart);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('state reset', () => {
    it('should reset state on touch end', () => {
      const { result } = renderHook(() => useTouchGesture());

      mockDetectSwipe.mockReturnValue('left');

      const touchStart = {
        touches: [{ clientX: 200, clientY: 100 }],
      } as any;

      const touchMove = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      const touchEnd = {
        changedTouches: [{ clientX: 100, clientY: 100 }],
        touches: [],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
        result.current.onTouchMove(touchMove);
      });

      expect(result.current.state.currentGesture).toBe('swipe');

      act(() => {
        result.current.onTouchEnd(touchEnd);
      });

      expect(result.current.state).toEqual({
        currentGesture: 'none',
        swipeDirection: null,
        isLongPressing: false,
        pinchScale: 1,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle touch end without touch start', () => {
      const { result } = renderHook(() => useTouchGesture());

      const touchEnd = {
        changedTouches: [{ clientX: 100, clientY: 100 }],
        touches: [],
      } as any;

      expect(() => {
        act(() => {
          result.current.onTouchEnd(touchEnd);
        });
      }).not.toThrow();
    });

    it('should handle touch move without touch start', () => {
      const { result } = renderHook(() => useTouchGesture());

      const touchMove = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      expect(() => {
        act(() => {
          result.current.onTouchMove(touchMove);
        });
      }).not.toThrow();
    });

    it('should handle no swipe direction detected', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() => useTouchGesture({ onSwipeLeft }));

      mockDetectSwipe.mockReturnValue(null);

      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as any;

      const touchEnd = {
        changedTouches: [{ clientX: 105, clientY: 100 }],
        touches: [],
      } as any;

      act(() => {
        result.current.onTouchStart(touchStart);
        result.current.onTouchEnd(touchEnd);
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();
    });
  });
});
