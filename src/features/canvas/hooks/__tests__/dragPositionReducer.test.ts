import { describe, it, expect } from 'vitest';
import { dragPositionReducer, INITIAL_DRAG_STATE, type DragAction } from '../dragPositionReducer';

describe('dragPositionReducer', () => {
    it('DRAG_MOVE adds position override for a node', () => {
        const state = dragPositionReducer(INITIAL_DRAG_STATE, {
            type: 'DRAG_MOVE',
            id: 'n1',
            position: { x: 10, y: 20 },
        });
        expect(state.overrides.get('n1')).toEqual({ x: 10, y: 20 });
    });

    it('multiple DRAG_MOVE for same node — last write wins', () => {
        let state = dragPositionReducer(INITIAL_DRAG_STATE, {
            type: 'DRAG_MOVE', id: 'n1', position: { x: 1, y: 1 },
        });
        state = dragPositionReducer(state, {
            type: 'DRAG_MOVE', id: 'n1', position: { x: 99, y: 99 },
        });
        expect(state.overrides.get('n1')).toEqual({ x: 99, y: 99 });
        expect(state.overrides.size).toBe(1);
    });

    it('multiple nodes accumulate in overrides map', () => {
        let state = dragPositionReducer(INITIAL_DRAG_STATE, {
            type: 'DRAG_MOVE', id: 'n1', position: { x: 1, y: 1 },
        });
        state = dragPositionReducer(state, {
            type: 'DRAG_MOVE', id: 'n2', position: { x: 2, y: 2 },
        });
        expect(state.overrides.size).toBe(2);
        expect(state.overrides.get('n1')).toEqual({ x: 1, y: 1 });
        expect(state.overrides.get('n2')).toEqual({ x: 2, y: 2 });
    });

    it('RESET clears all overrides', () => {
        let state = dragPositionReducer(INITIAL_DRAG_STATE, {
            type: 'DRAG_MOVE', id: 'n1', position: { x: 1, y: 1 },
        });
        state = dragPositionReducer(state, { type: 'RESET' });
        expect(state.overrides.size).toBe(0);
    });

    it('unknown action returns state unchanged', () => {
        const state = dragPositionReducer(INITIAL_DRAG_STATE, { type: 'UNKNOWN' } as unknown as DragAction);
        expect(state).toBe(INITIAL_DRAG_STATE);
    });

    it('DRAG_MOVE creates a new Map (immutability)', () => {
        const state1 = dragPositionReducer(INITIAL_DRAG_STATE, {
            type: 'DRAG_MOVE', id: 'n1', position: { x: 1, y: 1 },
        });
        const state2 = dragPositionReducer(state1, {
            type: 'DRAG_MOVE', id: 'n2', position: { x: 2, y: 2 },
        });
        expect(state2.overrides).not.toBe(state1.overrides);
    });
});
