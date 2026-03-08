import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useIdeaCardActions } from '../useIdeaCardActions';
import type { CanvasNode } from '../../types/node';

function createMockNode(id: string, overrides?: Partial<CanvasNode>): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        position: { x: 0, y: 0 },
        data: { prompt: '', output: '', tags: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('useIdeaCardActions undoable integration', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });
    });

    it('handleDelete uses undoable wrapper and pushes command', () => {
        const node = createMockNode('node-x');
        useCanvasStore.getState().addNode(node);

        const { result } = renderHook(() =>
            useIdeaCardActions({
                nodeId: 'node-x',
                getEditableContent: () => '',
                contentRef: { current: null },
                generateFromPrompt: () => {},
                branchFromNode: () => undefined,
            })
        );

        act(() => {
            result.current.handleDelete();
        });

        const history = useHistoryStore.getState();
        expect(history.undoStack).toHaveLength(1);
        expect(history.undoStack[0]?.type).toBe('deleteNode');
        // performing undo should bring the node back
        act(() => history.dispatch({ type: 'UNDO' }));
        expect(useCanvasStore.getState().nodes.map((n) => n.id)).toContain('node-x');
        // redo should re-delete it
        act(() => history.dispatch({ type: 'REDO' }));
        expect(useCanvasStore.getState().nodes.map((n) => n.id)).not.toContain('node-x');
    });
});
