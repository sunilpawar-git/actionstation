/**
 * useNodeContextMenu Tests — Hook for context menu open/close/position.
 * Covers: openAtCursor, openAtElement, close, long-press, touch-move cancel.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeContextMenu } from '../useNodeContextMenu';

describe('useNodeContextMenu', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('starts closed with null position', () => {
        const { result } = renderHook(() => useNodeContextMenu());
        expect(result.current.isOpen).toBe(false);
        expect(result.current.position).toBeNull();
    });

    it('openAtCursor sets position from clientX/clientY', () => {
        const { result } = renderHook(() => useNodeContextMenu());
        const event = { clientX: 150, clientY: 200, preventDefault: vi.fn(), stopPropagation: vi.fn() };
        act(() => { result.current.openAtCursor(event as unknown as React.MouseEvent); });
        expect(result.current.isOpen).toBe(true);
        expect(result.current.position).toEqual({ x: 150, y: 200 });
        expect(event.preventDefault).toHaveBeenCalledOnce();
        expect(event.stopPropagation).toHaveBeenCalledOnce();
    });

    it('openAtElement sets position from bounding rect', () => {
        const { result } = renderHook(() => useNodeContextMenu());
        const el = { getBoundingClientRect: () => ({ right: 300, top: 100 }) } as HTMLElement;
        act(() => { result.current.openAtElement(el); });
        expect(result.current.isOpen).toBe(true);
        expect(result.current.position).toEqual({ x: 304, y: 100 });
    });

    it('close resets position to null', () => {
        const { result } = renderHook(() => useNodeContextMenu());
        const event = { clientX: 50, clientY: 50, preventDefault: vi.fn(), stopPropagation: vi.fn() };
        act(() => { result.current.openAtCursor(event as unknown as React.MouseEvent); });
        expect(result.current.isOpen).toBe(true);
        act(() => { result.current.close(); });
        expect(result.current.isOpen).toBe(false);
        expect(result.current.position).toBeNull();
    });

    it('long-press opens after 400ms', () => {
        const { result } = renderHook(() => useNodeContextMenu());
        const touchEvent = { touches: [{ clientX: 200, clientY: 250 }] } as unknown as React.TouchEvent;
        act(() => { result.current.onTouchStart(touchEvent); });
        expect(result.current.isOpen).toBe(false);
        act(() => { vi.advanceTimersByTime(400); });
        expect(result.current.isOpen).toBe(true);
        expect(result.current.position).toEqual({ x: 200, y: 250 });
    });

    it('touch end before 400ms cancels open', () => {
        const { result } = renderHook(() => useNodeContextMenu());
        const touchEvent = { touches: [{ clientX: 100, clientY: 100 }] } as unknown as React.TouchEvent;
        act(() => { result.current.onTouchStart(touchEvent); });
        act(() => { vi.advanceTimersByTime(200); });
        act(() => { result.current.onTouchEnd(); });
        act(() => { vi.advanceTimersByTime(300); });
        expect(result.current.isOpen).toBe(false);
    });

    it('touch move beyond threshold cancels long-press', () => {
        const { result } = renderHook(() => useNodeContextMenu());
        const startEvent = { touches: [{ clientX: 100, clientY: 100 }] } as unknown as React.TouchEvent;
        act(() => { result.current.onTouchStart(startEvent); });
        const moveEvent = { touches: [{ clientX: 120, clientY: 100 }] } as unknown as React.TouchEvent;
        act(() => { result.current.onTouchMove(moveEvent); });
        act(() => { vi.advanceTimersByTime(500); });
        expect(result.current.isOpen).toBe(false);
    });

    it('small touch move does not cancel long-press', () => {
        const { result } = renderHook(() => useNodeContextMenu());
        const startEvent = { touches: [{ clientX: 100, clientY: 100 }] } as unknown as React.TouchEvent;
        act(() => { result.current.onTouchStart(startEvent); });
        const moveEvent = { touches: [{ clientX: 103, clientY: 102 }] } as unknown as React.TouchEvent;
        act(() => { result.current.onTouchMove(moveEvent); });
        act(() => { vi.advanceTimersByTime(400); });
        expect(result.current.isOpen).toBe(true);
    });

    it('unmount clears pending timer', () => {
        const { result, unmount } = renderHook(() => useNodeContextMenu());
        const touchEvent = { touches: [{ clientX: 50, clientY: 50 }] } as unknown as React.TouchEvent;
        act(() => { result.current.onTouchStart(touchEvent); });
        unmount();
        act(() => { vi.advanceTimersByTime(500); });
    });
});
