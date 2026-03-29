/**
 * useNodeHoverMenu — Logic for NodeHoverMenu: transform submenu toggle, outside-click.
 * Simplified: no deck2, no share/color submenus (moved to Right-click Menu).
 */
import { useRef, useCallback, useEffect } from 'react';
import { useNodeHoverMenuController } from './useNodeHoverMenuController';
import { useNodeHoverMenuOutsideHandlers } from './useNodeHoverMenuOutsideHandlers';

export function useNodeHoverMenu() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { state, actions: controllerActions } = useNodeHoverMenuController();
    const {
        onOutsidePointer, onEscape,
        handleHoverEnter, handleHoverLeave: controllerHoverLeave,
        openSubmenu, closeSubmenu, handleProximityLost: controllerProximityLost,
    } = controllerActions;

    // Track whether the submenu is open without a stale closure.
    // Proximity lost must NOT close a deliberately-opened submenu — the user
    // is mid-navigation from the toolbar button to the portal dropdown.
    const isSubmenuOpenRef = useRef(false);

    const handleHoverLeave = useCallback((event?: { relatedTarget?: EventTarget | null }) => {
        if (event?.relatedTarget instanceof Node && containerRef.current?.contains(event.relatedTarget)) {
            return;
        }
        controllerHoverLeave(event);
    }, [controllerHoverLeave]);

    const isTransformOpen = state.activeSubmenu === 'transform';
    isSubmenuOpenRef.current = isTransformOpen;
    const isActive = isTransformOpen;

    const handleProximityLost = useCallback(() => {
        // Guard: if the user explicitly opened the dropdown (mode = 'manual') keep
        // it open so they can reach the portal. OUTSIDE_POINTER / Escape still close it.
        if (isSubmenuOpenRef.current) return;
        controllerProximityLost();
    }, [controllerProximityLost]);
    useNodeHoverMenuOutsideHandlers(containerRef, isActive, onEscape, onOutsidePointer);

    useEffect(() => {
        if (!containerRef.current) return;
        if (isActive) {
            containerRef.current.setAttribute('data-bar-active', 'true');
        } else {
            containerRef.current.removeAttribute('data-bar-active');
        }
    }, [isActive]);

    const handleTransformToggle = useCallback(() => {
        if (isTransformOpen) closeSubmenu();
        else openSubmenu('transform');
    }, [closeSubmenu, openSubmenu, isTransformOpen]);

    return {
        containerRef,
        handleHoverEnter,
        handleHoverLeave,
        handleProximityLost,
        closeSubmenu,
        isTransformOpen,
        handleTransformToggle,
    };
}
