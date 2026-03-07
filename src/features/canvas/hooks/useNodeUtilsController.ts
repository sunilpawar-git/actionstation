/**
 * useNodeUtilsController — React hook wiring for the NodeUtilsBar state machine.
 * Simplified: no deck2 hover-intent, no pin-open state.
 */
import { useCallback, useReducer, useRef } from 'react';
import {
    nodeUtilsControllerReducer,
    initialNodeUtilsControllerState,
    isPortalBoundaryTarget,
} from './nodeUtilsControllerReducer';
import type { NodeUtilsSubmenu } from './nodeUtilsControllerReducer';

export { NODE_UTILS_PORTAL_ATTR, initialNodeUtilsControllerState, nodeUtilsControllerReducer } from './nodeUtilsControllerReducer';
export type { NodeUtilsSubmenu, NodeUtilsMode, NodeUtilsControllerState, NodeUtilsControllerEvent } from './nodeUtilsControllerReducer';

export function useNodeUtilsController() {
    const [state, dispatch] = useReducer(nodeUtilsControllerReducer, initialNodeUtilsControllerState);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleHoverEnter = useCallback(() => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    }, []);

    const handleHoverLeave = useCallback((event?: { relatedTarget?: EventTarget | null }) => {
        if (isPortalBoundaryTarget(event?.relatedTarget)) return;
        leaveTimerRef.current = setTimeout(() => {
            dispatch({ type: 'HOVER_LEAVE' });
        }, 300);
    }, []);

    const openSubmenu = useCallback((submenu: Exclude<NodeUtilsSubmenu, 'none'>) => {
        dispatch({ type: 'OPEN_SUBMENU', submenu });
    }, []);

    const closeSubmenu = useCallback(() => { dispatch({ type: 'CLOSE_SUBMENU' }); }, []);
    const onEscape = useCallback(() => { dispatch({ type: 'ESCAPE' }); }, []);

    const onOutsidePointer = useCallback(() => {
        dispatch({ type: 'OUTSIDE_POINTER' });
    }, []);

    const handleProximityLost = useCallback(() => { dispatch({ type: 'PROXIMITY_LOST' }); }, []);

    return {
        state,
        actions: {
            handleHoverEnter, handleHoverLeave,
            openSubmenu, closeSubmenu, onEscape, onOutsidePointer, handleProximityLost,
        },
    };
}
