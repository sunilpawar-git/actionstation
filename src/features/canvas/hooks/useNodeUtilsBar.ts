/**
 * useNodeUtilsBar — Logic for NodeUtilsBar: transform submenu toggle, outside-click.
 * Simplified: no deck2, no share/color submenus (moved to context menu).
 */
import { useRef, useCallback, useEffect } from 'react';
import { useNodeUtilsController } from './useNodeUtilsController';
import { useNodeUtilsBarOutsideHandlers } from './useNodeUtilsBarOutsideHandlers';

export function useNodeUtilsBar() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { state, actions: controllerActions } = useNodeUtilsController();
    const {
        onOutsidePointer, onEscape,
        handleHoverEnter, handleHoverLeave: controllerHoverLeave,
        openSubmenu, closeSubmenu, handleProximityLost,
    } = controllerActions;

    const handleHoverLeave = useCallback((event?: { relatedTarget?: EventTarget | null }) => {
        if (event?.relatedTarget instanceof Node && containerRef.current?.contains(event.relatedTarget)) {
            return;
        }
        controllerHoverLeave(event);
    }, [controllerHoverLeave]);

    const isTransformOpen = state.activeSubmenu === 'transform';
    const isActive = isTransformOpen;
    useNodeUtilsBarOutsideHandlers(containerRef, isActive, onEscape, onOutsidePointer);

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
