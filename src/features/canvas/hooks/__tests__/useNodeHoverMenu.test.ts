/**
 * useNodeHoverMenu — Tests for transform submenu lifecycle.
 *
 * Regression: moving the mouse from the toolbar to the transform portal dropdown
 * triggered proximity-lost which unconditionally closed the submenu (even when
 * the user had intentionally opened it via click, i.e. mode === 'manual').
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeHoverMenu } from '../useNodeHoverMenu';

describe('useNodeHoverMenu — transform submenu lifecycle', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    it('starts with transform submenu closed', () => {
        const { result } = renderHook(() => useNodeHoverMenu());
        expect(result.current.isTransformOpen).toBe(false);
    });

    it('handleTransformToggle opens the submenu', () => {
        const { result } = renderHook(() => useNodeHoverMenu());
        act(() => { result.current.handleTransformToggle(); });
        expect(result.current.isTransformOpen).toBe(true);
    });

    it('proximity lost does NOT close submenu when it is open (hover-gap bug fix)', () => {
        // Regression test: user clicks transform button, then moves mouse toward the
        // portal dropdown. The card's mouseleave fires a 300ms proximity timer that
        // must NOT close the dropdown while the user is navigating to it.
        const { result } = renderHook(() => useNodeHoverMenu());

        // Step 1 — user clicks the transform button (mode → 'manual')
        act(() => { result.current.handleTransformToggle(); });
        expect(result.current.isTransformOpen).toBe(true);

        // Step 2 — mouse exits the card wrapper (toward portal) → proximity fires
        act(() => { result.current.handleProximityLost(); });

        // Submenu must remain open so the user can click a menu option
        expect(result.current.isTransformOpen).toBe(true);
    });

    it('proximity lost is a no-op when submenu is already closed', () => {
        const { result } = renderHook(() => useNodeHoverMenu());
        act(() => { result.current.handleProximityLost(); });
        expect(result.current.isTransformOpen).toBe(false);
    });

    it('closeSubmenu still closes the submenu (via portal item click path)', () => {
        const { result } = renderHook(() => useNodeHoverMenu());
        act(() => { result.current.handleTransformToggle(); });
        expect(result.current.isTransformOpen).toBe(true);
        act(() => { result.current.closeSubmenu(); });
        expect(result.current.isTransformOpen).toBe(false);
    });

    it('toggle while open closes the submenu', () => {
        const { result } = renderHook(() => useNodeHoverMenu());
        act(() => { result.current.handleTransformToggle(); }); // open
        act(() => { result.current.handleTransformToggle(); }); // close
        expect(result.current.isTransformOpen).toBe(false);
    });

    it('HOVER_LEAVE in auto mode (no submenu) closes nothing extra', () => {
        const { result } = renderHook(() => useNodeHoverMenu());
        act(() => { result.current.handleHoverLeave(); });
        act(() => { vi.advanceTimersByTime(300); });
        expect(result.current.isTransformOpen).toBe(false);
    });

    it('proximity lost after submenu is closed behaves normally', () => {
        // Open, close, then proximity fires — should be no-op (submenu already closed)
        const { result } = renderHook(() => useNodeHoverMenu());
        act(() => { result.current.handleTransformToggle(); }); // open
        act(() => { result.current.closeSubmenu(); });           // close (user clicked item)
        act(() => { result.current.handleProximityLost(); });    // proximity fires after
        expect(result.current.isTransformOpen).toBe(false);
    });
});
