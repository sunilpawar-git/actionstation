/**
 * nodeUtilsControllerReducer — Pure state machine for NodeUtilsBar interactions.
 * Handles submenu open/close and outside pointer dismissal.
 * Simplified: no deck-two state (secondary actions moved to context menu).
 */

export const NODE_UTILS_PORTAL_ATTR = 'data-node-utils-zone';

export type NodeUtilsSubmenu = 'none' | 'transform';
export type NodeUtilsMode = 'auto' | 'manual';

export interface NodeUtilsControllerState {
    mode: NodeUtilsMode;
    activeSubmenu: NodeUtilsSubmenu;
}

export type NodeUtilsControllerEvent =
    | { type: 'HOVER_LEAVE' }
    | { type: 'OPEN_SUBMENU'; submenu: Exclude<NodeUtilsSubmenu, 'none'> }
    | { type: 'CLOSE_SUBMENU' }
    | { type: 'ESCAPE' }
    | { type: 'OUTSIDE_POINTER' }
    | { type: 'PROXIMITY_LOST' };

export const initialNodeUtilsControllerState: NodeUtilsControllerState = {
    mode: 'auto',
    activeSubmenu: 'none',
};

function handleHoverLeave(s: NodeUtilsControllerState): NodeUtilsControllerState {
    if (s.mode !== 'auto') return s;
    if (s.activeSubmenu === 'none') return s;
    return { ...s, activeSubmenu: 'none' };
}

function handleEscape(s: NodeUtilsControllerState): NodeUtilsControllerState {
    if (s.activeSubmenu !== 'none') return { ...s, activeSubmenu: 'none' };
    if (s.mode === 'auto') return s;
    return { ...s, activeSubmenu: 'none', mode: 'auto' };
}

function handleProximityLost(s: NodeUtilsControllerState): NodeUtilsControllerState {
    if (s.activeSubmenu !== 'none') return { ...s, activeSubmenu: 'none', mode: 'auto' };
    if (s.mode === 'auto') return s;
    return { ...s, mode: 'auto' };
}

function handleOutsidePointer(s: NodeUtilsControllerState): NodeUtilsControllerState {
    if (s.activeSubmenu === 'none' && s.mode === 'auto') return s;
    return { ...s, activeSubmenu: 'none', mode: 'auto' };
}

export function nodeUtilsControllerReducer(
    state: NodeUtilsControllerState,
    event: NodeUtilsControllerEvent,
): NodeUtilsControllerState {
    switch (event.type) {
        case 'HOVER_LEAVE':
            return handleHoverLeave(state);
        case 'OPEN_SUBMENU':
            return { ...state, mode: 'manual', activeSubmenu: event.submenu };
        case 'CLOSE_SUBMENU':
            if (state.activeSubmenu === 'none') return state;
            return { ...state, activeSubmenu: 'none' };
        case 'ESCAPE':
            return handleEscape(state);
        case 'PROXIMITY_LOST':
            return handleProximityLost(state);
        case 'OUTSIDE_POINTER':
            return handleOutsidePointer(state);
        default:
            return state;
    }
}

export function isPortalBoundaryTarget(target: EventTarget | null | undefined): boolean {
    const element = target instanceof HTMLElement ? target : null;
    return Boolean(element?.closest(`[${NODE_UTILS_PORTAL_ATTR}="true"]`));
}
