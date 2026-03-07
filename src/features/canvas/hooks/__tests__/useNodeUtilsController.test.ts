/**
 * useNodeUtilsController Tests — Simplified state machine.
 * No deck2, no hover-intent, no pin-open. Only transform submenu.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    initialNodeUtilsControllerState,
    nodeUtilsControllerReducer,
    useNodeUtilsController,
} from '../useNodeUtilsController';

describe('nodeUtilsControllerReducer (simplified)', () => {
    it('OPEN_SUBMENU sets activeSubmenu', () => {
        const next = nodeUtilsControllerReducer(initialNodeUtilsControllerState, {
            type: 'OPEN_SUBMENU', submenu: 'transform',
        });
        expect(next.activeSubmenu).toBe('transform');
        expect(next.mode).toBe('manual');
    });

    it('CLOSE_SUBMENU clears activeSubmenu', () => {
        const prev = { ...initialNodeUtilsControllerState, activeSubmenu: 'transform' as const, mode: 'manual' as const };
        const next = nodeUtilsControllerReducer(prev, { type: 'CLOSE_SUBMENU' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('CLOSE_SUBMENU returns same ref when already none', () => {
        expect(nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'CLOSE_SUBMENU' }))
            .toBe(initialNodeUtilsControllerState);
    });

    it('ESCAPE closes submenu', () => {
        const open = { ...initialNodeUtilsControllerState, activeSubmenu: 'transform' as const, mode: 'manual' as const };
        const next = nodeUtilsControllerReducer(open, { type: 'ESCAPE' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('ESCAPE from idle is no-op', () => {
        expect(nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'ESCAPE' }))
            .toBe(initialNodeUtilsControllerState);
    });

    it('HOVER_LEAVE in auto mode closes submenu', () => {
        const state = { ...initialNodeUtilsControllerState, activeSubmenu: 'transform' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'HOVER_LEAVE' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('HOVER_LEAVE in manual mode is no-op', () => {
        const state = { ...initialNodeUtilsControllerState, mode: 'manual' as const, activeSubmenu: 'transform' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'HOVER_LEAVE' });
        expect(next).toBe(state);
    });

    it('OUTSIDE_POINTER closes everything and resets to auto', () => {
        const state = { ...initialNodeUtilsControllerState, activeSubmenu: 'transform' as const, mode: 'manual' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'OUTSIDE_POINTER' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });

    it('OUTSIDE_POINTER from idle auto is no-op', () => {
        expect(nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'OUTSIDE_POINTER' }))
            .toBe(initialNodeUtilsControllerState);
    });

    it('PROXIMITY_LOST with active submenu closes submenu and resets to auto', () => {
        const state = { ...initialNodeUtilsControllerState, activeSubmenu: 'transform' as const, mode: 'manual' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'PROXIMITY_LOST' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });

    it('PROXIMITY_LOST in manual mode returns to auto', () => {
        const state = { ...initialNodeUtilsControllerState, mode: 'manual' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'PROXIMITY_LOST' });
        expect(next.mode).toBe('auto');
    });

    it('PROXIMITY_LOST from idle auto is no-op', () => {
        expect(nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'PROXIMITY_LOST' }))
            .toBe(initialNodeUtilsControllerState);
    });
});

describe('useNodeUtilsController', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    it('starts with submenu none', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('openSubmenu sets activeSubmenu', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        expect(result.current.state.activeSubmenu).toBe('transform');
    });

    it('closeSubmenu clears activeSubmenu', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.closeSubmenu(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('hover leave dispatches HOVER_LEAVE after 300ms', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.handleHoverLeave(); });
        expect(result.current.state.activeSubmenu).toBe('transform');
        act(() => { vi.advanceTimersByTime(300); });
    });

    it('hover leave ignores portal-boundary related target', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        const portalRoot = document.createElement('div');
        portalRoot.setAttribute('data-node-utils-zone', 'true');
        const child = document.createElement('button');
        portalRoot.appendChild(child);
        document.body.appendChild(portalRoot);
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.handleHoverLeave({ relatedTarget: child }); });
        expect(result.current.state.activeSubmenu).toBe('transform');
        portalRoot.remove();
    });

    it('onOutsidePointer closes everything', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.onOutsidePointer(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('onEscape closes submenu', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.onEscape(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('handleProximityLost closes active submenu and resets to auto', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.handleProximityLost(); });
        expect(result.current.state.activeSubmenu).toBe('none');
        expect(result.current.state.mode).toBe('auto');
    });
});
