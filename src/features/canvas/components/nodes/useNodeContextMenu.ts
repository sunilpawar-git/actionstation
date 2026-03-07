/**
 * useNodeContextMenu — Local state for the node right-click / "More..." context menu.
 * Manages open/close and position. No Zustand store — ephemeral UI state.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

const LONG_PRESS_MS = 400;
const MENU_OFFSET_PX = 4;
const TOUCH_MOVE_THRESHOLD_PX = 10;

interface ContextMenuState {
    position: { x: number; y: number } | null;
}

function cancelTimer(ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
    if (ref.current) { clearTimeout(ref.current); ref.current = null; }
}

export function useNodeContextMenu() {
    const [state, setState] = useState<ContextMenuState>({ position: null });
    const isOpen = state.position !== null;
    const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchOriginRef = useRef<{ x: number; y: number } | null>(null);

    const openAtCursor = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setState({ position: { x: e.clientX, y: e.clientY } });
    }, []);

    const openAtElement = useCallback((element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        setState({ position: { x: rect.right + MENU_OFFSET_PX, y: rect.top } });
    }, []);

    const close = useCallback(() => setState({ position: null }), []);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        cancelTimer(touchTimerRef);
        const touch = e.touches[0];
        if (!touch) return;
        const x = touch.clientX, y = touch.clientY;
        touchOriginRef.current = { x, y };
        touchTimerRef.current = setTimeout(() => {
            setState({ position: { x, y } });
            touchTimerRef.current = null;
        }, LONG_PRESS_MS);
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchTimerRef.current || !touchOriginRef.current) return;
        const touch = e.touches[0];
        if (!touch) return;
        const dx = touch.clientX - touchOriginRef.current.x;
        const dy = touch.clientY - touchOriginRef.current.y;
        if (dx * dx + dy * dy > TOUCH_MOVE_THRESHOLD_PX * TOUCH_MOVE_THRESHOLD_PX) {
            cancelTimer(touchTimerRef);
        }
    }, []);

    const onTouchEnd = useCallback(() => { cancelTimer(touchTimerRef); }, []);
    useEffect(() => () => { cancelTimer(touchTimerRef); }, []);

    return { isOpen, position: state.position, openAtCursor, openAtElement, close, onTouchStart, onTouchMove, onTouchEnd };
}
