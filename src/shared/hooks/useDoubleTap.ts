/**
 * useDoubleTap — Reusable double-tap detector for touch devices.
 *
 * Returns a touchend handler that detects two taps within a time threshold
 * and position tolerance, then calls the provided callback.
 *
 * Pure hook: no store dependencies, no side effects beyond the callback.
 * Exported constants allow tests to validate exact thresholds.
 */
import { useCallback, useRef } from 'react';

/** Maximum time between taps to count as a double-tap. */
export const DOUBLE_TAP_THRESHOLD_MS = 300;

/** Maximum distance (px) between taps to count as same-position. */
export const DOUBLE_TAP_DISTANCE_PX = 20;

interface TapRecord {
    x: number;
    y: number;
    time: number;
}

/**
 * @param onDoubleTap - Callback invoked with the second touchend event on double-tap
 * @returns A touchend handler to attach to the target element
 */
export function useDoubleTap(
    onDoubleTap: (event: React.TouchEvent) => void,
): (event: React.TouchEvent) => void {
    const lastTapRef = useRef<TapRecord | null>(null);

    return useCallback((event: React.TouchEvent) => {
        const touch = event.changedTouches[0];
        if (!touch) return;

        const now = Date.now();
        const { clientX, clientY } = touch;
        const last = lastTapRef.current;

        if (last) {
            const elapsed = now - last.time;
            const dx = Math.abs(clientX - last.x);
            const dy = Math.abs(clientY - last.y);

            if (elapsed < DOUBLE_TAP_THRESHOLD_MS && dx < DOUBLE_TAP_DISTANCE_PX && dy < DOUBLE_TAP_DISTANCE_PX) {
                // Double-tap detected — reset and invoke
                lastTapRef.current = null;
                onDoubleTap(event);
                return;
            }
        }

        // Record this tap as the first of a potential pair
        lastTapRef.current = { x: clientX, y: clientY, time: now };
    }, [onDoubleTap]);
}
