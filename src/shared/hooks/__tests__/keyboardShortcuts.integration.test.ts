/**
 * Keyboard Shortcuts Integration Test
 * Verifies all documented shortcuts fire their expected actions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';

import { fireKeyDown } from './keyboardShortcutTestHelpers';

const { mockClearSelection, mockCanvasStore } = vi.hoisted(() => {
    const mockDeleteNode = vi.fn();
    const mockClearSelection = vi.fn();
    const mockCanvasStore = Object.assign(
        vi.fn((selector?: (state: unknown) => unknown) => {
            const state = { selectedNodeIds: new Set(['node-1']), editingNodeId: null };
            return selector ? selector(state) : state;
        }),
        {
            getState: () => ({
                deleteNode: mockDeleteNode,
                clearSelection: mockClearSelection,
                selectedNodeIds: new Set(['node-1']),
            }),
        },
    );
    return { mockClearSelection, mockCanvasStore };
});

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: mockCanvasStore,
}));

describe('Keyboard Shortcuts Integration', () => {
    const mockOnOpenSettings = vi.fn();
    const mockOnAddNode = vi.fn();
    const mockOnQuickCapture = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => { vi.restoreAllMocks(); });

    it('should handle all documented shortcuts without error', () => {
        renderHook(() => useKeyboardShortcuts({
            onOpenSettings: mockOnOpenSettings,
            onAddNode: mockOnAddNode,
            onQuickCapture: mockOnQuickCapture,
        }));

        // All shortcuts that should work
        expect(() => {
            fireKeyDown(',', { metaKey: true }); // Open Settings
            fireKeyDown('n', { metaKey: true });  // Quick Capture
            fireKeyDown('n');                      // Add Node
            fireKeyDown('Delete');                 // Delete selected
            fireKeyDown('Backspace');              // Delete selected (alt)
            fireKeyDown('Escape');                 // Clear selection
        }).not.toThrow();
    });

    it('Cmd+, should open settings', () => {
        renderHook(() => useKeyboardShortcuts({ onOpenSettings: mockOnOpenSettings }));
        fireKeyDown(',', { metaKey: true });
        expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('Cmd+N should quick capture', () => {
        renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
        fireKeyDown('n', { metaKey: true });
        expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
    });

    it('N should add node', () => {
        renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
        fireKeyDown('n');
        expect(mockOnAddNode).toHaveBeenCalledTimes(1);
    });

    it('Delete should delete selected nodes', () => {
        const mockOnDeleteNodes = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onDeleteNodes: mockOnDeleteNodes }));
        fireKeyDown('Delete');
        expect(mockOnDeleteNodes).toHaveBeenCalledWith(['node-1']);
        // clearSelection is NOT called synchronously — deleteNodeWithUndo is async
        // and clears the selection atomically inside deleteNodes() after confirm resolves.
        expect(mockClearSelection).not.toHaveBeenCalled();
    });

    it('Backspace should delete selected nodes', () => {
        const mockOnDeleteNodes = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onDeleteNodes: mockOnDeleteNodes }));
        fireKeyDown('Backspace');
        expect(mockOnDeleteNodes).toHaveBeenCalledWith(['node-1']);
        // clearSelection is NOT called synchronously — see Delete test comment above.
        expect(mockClearSelection).not.toHaveBeenCalled();
    });

    it('Escape should clear selection', () => {
        renderHook(() => useKeyboardShortcuts({}));
        fireKeyDown('Escape');
        expect(mockClearSelection).toHaveBeenCalledTimes(1);
    });

    it('Cmd+N should preventDefault to block browser new-tab behavior', () => {
        renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
        const event = fireKeyDown('n', { metaKey: true });
        expect(event.defaultPrevented).toBe(true);
        expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
    });

    it('Cmd+N should stopImmediatePropagation to prevent other handlers', () => {
        renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));

        const rivalHandler = vi.fn();
        document.addEventListener('keydown', rivalHandler, { capture: true });

        fireKeyDown('n', { metaKey: true });
        expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        expect(rivalHandler).not.toHaveBeenCalled();

        document.removeEventListener('keydown', rivalHandler, { capture: true });
    });

    it('N key from search input should not trigger addNode', () => {
        renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));

        const input = document.createElement('input');
        input.type = 'text';
        document.body.appendChild(input);
        input.focus();

        const event = new KeyboardEvent('keydown', {
            key: 'n', bubbles: true, cancelable: true,
        });
        Object.defineProperty(event, 'target', { value: input });
        document.dispatchEvent(event);

        expect(mockOnAddNode).not.toHaveBeenCalled();
        input.remove();
    });

    it('shortcuts should be suppressed when editing a node', () => {
        mockCanvasStore.mockImplementation(
            (selector?: (state: unknown) => unknown) => {
                const state = {
                    selectedNodeIds: new Set(['node-1']),
                    editingNodeId: 'node-1',
                };
                return selector ? selector(state) : state;
            }
        );

        const mockOnDeleteNodes = vi.fn();
        renderHook(() => useKeyboardShortcuts({
            onAddNode: mockOnAddNode,
            onOpenSettings: mockOnOpenSettings,
            onQuickCapture: mockOnQuickCapture,
            onDeleteNodes: mockOnDeleteNodes,
        }));

        // Non-modifier shortcuts should be suppressed
        fireKeyDown('n');
        expect(mockOnAddNode).not.toHaveBeenCalled();
        fireKeyDown('Delete');
        expect(mockOnDeleteNodes).not.toHaveBeenCalled();
        fireKeyDown('Escape');
        expect(mockClearSelection).not.toHaveBeenCalled();

        // Modifier shortcuts should still work
        fireKeyDown(',', { metaKey: true });
        expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
        fireKeyDown('n', { metaKey: true });
        expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
    });
});
