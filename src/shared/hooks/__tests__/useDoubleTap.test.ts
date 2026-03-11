/**
 * useDoubleTap — Unit tests for the reusable touch double-tap detector.
 *
 * Validates: timing threshold, position tolerance, cleanup, guard conditions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDoubleTap, DOUBLE_TAP_THRESHOLD_MS, DOUBLE_TAP_DISTANCE_PX } from '@/shared/hooks/useDoubleTap';

function makeTouchEvent(clientX: number, clientY: number, targetClass = 'react-flow__pane'): React.TouchEvent {
    const target = document.createElement('div');
    target.classList.add(targetClass);
    return {
        changedTouches: [{ clientX, clientY }],
        target,
        preventDefault: vi.fn(),
    } as unknown as React.TouchEvent;
}

describe('useDoubleTap', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls onDoubleTap when two taps occur within threshold', () => {
        const onDoubleTap = vi.fn();
        const { result } = renderHook(() => useDoubleTap(onDoubleTap));

        act(() => {
            result.current(makeTouchEvent(100, 100));
        });

        // Advance time within threshold
        vi.advanceTimersByTime(DOUBLE_TAP_THRESHOLD_MS - 50);

        act(() => {
            result.current(makeTouchEvent(100, 100));
        });

        expect(onDoubleTap).toHaveBeenCalledTimes(1);
        expect(onDoubleTap).toHaveBeenCalledWith(
            expect.objectContaining({ changedTouches: expect.any(Array) }),
        );
    });

    it('does NOT fire if taps are too far apart in time', () => {
        const onDoubleTap = vi.fn();
        const { result } = renderHook(() => useDoubleTap(onDoubleTap));

        act(() => {
            result.current(makeTouchEvent(100, 100));
        });

        vi.advanceTimersByTime(DOUBLE_TAP_THRESHOLD_MS + 50);

        act(() => {
            result.current(makeTouchEvent(100, 100));
        });

        expect(onDoubleTap).not.toHaveBeenCalled();
    });

    it('does NOT fire if taps are too far apart in position', () => {
        const onDoubleTap = vi.fn();
        const { result } = renderHook(() => useDoubleTap(onDoubleTap));

        act(() => {
            result.current(makeTouchEvent(100, 100));
        });

        vi.advanceTimersByTime(100);

        act(() => {
            result.current(makeTouchEvent(100 + DOUBLE_TAP_DISTANCE_PX + 5, 100));
        });

        expect(onDoubleTap).not.toHaveBeenCalled();
    });

    it('accepts taps within distance tolerance', () => {
        const onDoubleTap = vi.fn();
        const { result } = renderHook(() => useDoubleTap(onDoubleTap));

        act(() => {
            result.current(makeTouchEvent(100, 100));
        });

        vi.advanceTimersByTime(100);

        act(() => {
            result.current(makeTouchEvent(100 + DOUBLE_TAP_DISTANCE_PX - 1, 100));
        });

        expect(onDoubleTap).toHaveBeenCalledTimes(1);
    });

    it('resets after a successful double-tap', () => {
        const onDoubleTap = vi.fn();
        const { result } = renderHook(() => useDoubleTap(onDoubleTap));

        // First double-tap
        act(() => { result.current(makeTouchEvent(100, 100)); });
        vi.advanceTimersByTime(100);
        act(() => { result.current(makeTouchEvent(100, 100)); });
        expect(onDoubleTap).toHaveBeenCalledTimes(1);

        // Third tap alone should NOT fire
        vi.advanceTimersByTime(100);
        act(() => { result.current(makeTouchEvent(100, 100)); });
        expect(onDoubleTap).toHaveBeenCalledTimes(1);
    });
});
