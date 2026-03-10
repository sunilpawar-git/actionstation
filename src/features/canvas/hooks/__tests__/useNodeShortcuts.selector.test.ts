/**
 * useNodeShortcuts -- getState() optimization tests
 * Verifies the hook does NOT subscribe to editingNodeId via a selector.
 * Instead it reads editingNodeId via getState() inside the keydown handler,
 * eliminating O(N) re-renders on edit start/stop transitions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeShortcuts } from '../useNodeShortcuts';

describe('useNodeShortcuts getState() optimization', () => {
    beforeEach(() => {
        useCanvasStore.setState({ editingNodeId: null });
    });

    it('does not re-render when editingNodeId changes at all (no subscription)', () => {
        let renderCount = 0;
        const shortcuts = { t: () => {} };

        renderHook(() => {
            renderCount++;
            useNodeShortcuts(true, shortcuts);
        });

        const afterInitial = renderCount;

        act(() => { useCanvasStore.setState({ editingNodeId: 'node-A' }); });
        expect(renderCount).toBe(afterInitial);

        act(() => { useCanvasStore.setState({ editingNodeId: 'node-B' }); });
        expect(renderCount).toBe(afterInitial);

        act(() => { useCanvasStore.setState({ editingNodeId: null }); });
        expect(renderCount).toBe(afterInitial);
    });

    it('blocks shortcut when editingNodeId is set (checked via getState)', () => {
        const calls: string[] = [];
        const shortcuts = { t: () => { calls.push('t'); } };

        renderHook(() => {
            useNodeShortcuts(true, shortcuts);
        });

        // Shortcut should fire when no editing
        const keyEvent = new KeyboardEvent('keydown', { key: 't', bubbles: true });
        act(() => { document.dispatchEvent(keyEvent); });
        expect(calls).toHaveLength(1);

        // Set editing state -- shortcut should be blocked
        act(() => { useCanvasStore.setState({ editingNodeId: 'node-A' }); });
        const keyEvent2 = new KeyboardEvent('keydown', { key: 't', bubbles: true });
        act(() => { document.dispatchEvent(keyEvent2); });
        expect(calls).toHaveLength(1); // still 1, blocked
    });
});
