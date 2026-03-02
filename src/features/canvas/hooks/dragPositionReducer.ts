/**
 * dragPositionReducer — Pure reducer for isolating drag positions from canvasStore.
 *
 * During drag, position changes accumulate here instead of hitting the Zustand
 * store. On drag end, overrides are batch-committed to the store in one setState.
 * This eliminates O(N) re-renders across all nodes during drag.
 */
import type { NodePosition } from '../types/node';

export interface DragState {
    overrides: ReadonlyMap<string, NodePosition>;
}

export type DragAction =
    | { type: 'DRAG_MOVE'; id: string; position: NodePosition }
    | { type: 'RESET' };

export const INITIAL_DRAG_STATE: DragState = {
    overrides: new Map(),
};

export function dragPositionReducer(state: DragState, action: DragAction): DragState {
    switch (action.type) {
        case 'DRAG_MOVE': {
            const next = new Map(state.overrides);
            next.set(action.id, action.position);
            return { overrides: next };
        }
        case 'RESET':
            return INITIAL_DRAG_STATE;
        default:
            return state;
    }
}
