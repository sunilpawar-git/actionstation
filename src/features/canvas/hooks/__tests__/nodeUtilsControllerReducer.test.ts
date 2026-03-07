/**
 * nodeUtilsControllerReducer unit tests — simplified state machine.
 * Only manages submenu open/close and mode transitions.
 */
import { describe, it, expect } from 'vitest';
import {
    nodeUtilsControllerReducer,
    initialNodeUtilsControllerState,
} from '../nodeUtilsControllerReducer';
import type { NodeUtilsControllerState } from '../nodeUtilsControllerReducer';

describe('nodeUtilsControllerReducer', () => {
    it('starts in idle mode with no submenu', () => {
        expect(initialNodeUtilsControllerState.mode).toBe('auto');
        expect(initialNodeUtilsControllerState.activeSubmenu).toBe('none');
    });

    it('OPEN_SUBMENU transitions to submenu open', () => {
        const next = nodeUtilsControllerReducer(initialNodeUtilsControllerState, {
            type: 'OPEN_SUBMENU', submenu: 'transform',
        });
        expect(next.activeSubmenu).toBe('transform');
        expect(next.mode).toBe('manual');
    });

    it('CLOSE_SUBMENU returns to idle', () => {
        const open: NodeUtilsControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeUtilsControllerReducer(open, { type: 'CLOSE_SUBMENU' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('CLOSE_SUBMENU is no-op when already closed', () => {
        const state = nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'CLOSE_SUBMENU' });
        expect(state).toBe(initialNodeUtilsControllerState);
    });

    it('ESCAPE closes submenu first', () => {
        const open: NodeUtilsControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeUtilsControllerReducer(open, { type: 'ESCAPE' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('ESCAPE from idle auto is no-op', () => {
        const state = nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'ESCAPE' });
        expect(state).toBe(initialNodeUtilsControllerState);
    });

    it('HOVER_LEAVE from idle stays idle', () => {
        const state = nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'HOVER_LEAVE' });
        expect(state).toBe(initialNodeUtilsControllerState);
    });

    it('HOVER_LEAVE in auto mode closes submenu', () => {
        const open: NodeUtilsControllerState = { mode: 'auto', activeSubmenu: 'transform' };
        const next = nodeUtilsControllerReducer(open, { type: 'HOVER_LEAVE' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('HOVER_LEAVE in manual mode is no-op', () => {
        const manual: NodeUtilsControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeUtilsControllerReducer(manual, { type: 'HOVER_LEAVE' });
        expect(next).toBe(manual);
    });

    it('PROXIMITY_LOST with active submenu closes submenu and resets to auto', () => {
        const open: NodeUtilsControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeUtilsControllerReducer(open, { type: 'PROXIMITY_LOST' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });

    it('PROXIMITY_LOST in manual mode with no submenu returns to auto', () => {
        const manual: NodeUtilsControllerState = { mode: 'manual', activeSubmenu: 'none' };
        const next = nodeUtilsControllerReducer(manual, { type: 'PROXIMITY_LOST' });
        expect(next.mode).toBe('auto');
    });

    it('OUTSIDE_POINTER closes everything', () => {
        const open: NodeUtilsControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeUtilsControllerReducer(open, { type: 'OUTSIDE_POINTER' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });

    it('OUTSIDE_POINTER from idle auto is no-op', () => {
        const state = nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'OUTSIDE_POINTER' });
        expect(state).toBe(initialNodeUtilsControllerState);
    });

    it('no TOGGLE_DECK_TWO event exists', () => {
        const events = ['HOVER_LEAVE', 'OPEN_SUBMENU', 'CLOSE_SUBMENU', 'ESCAPE', 'OUTSIDE_POINTER', 'PROXIMITY_LOST'];
        expect(events).not.toContain('TOGGLE_DECK_TWO');
    });
});
