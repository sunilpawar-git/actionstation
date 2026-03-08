import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Position } from '@xyflow/react';
import { DeletableEdge } from '../DeletableEdge';
import { useCanvasStore } from '../../../stores/canvasStore';
import { useHistoryStore } from '../../../stores/historyStore';
import { createEdge } from '../../../types/edge';

// mock minimal parts of @xyflow/react used by DeletableEdge
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        getBezierPath: () => ['M0,0 L10,10', 5, 5],
        BaseEdge: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

describe('DeletableEdge undoable integration', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [],
            edges: [],
        });
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });
    });

    it('clicking delete removes edge and pushes history entry', () => {
        // Nodes must exist so undo's orphan guard restores the edge
        const makeNode = (id: string) => ({
            id, workspaceId: 'ws-1', type: 'idea' as const,
            position: { x: 0, y: 0 }, data: { output: '' },
            createdAt: new Date(), updatedAt: new Date(),
        });
        useCanvasStore.setState({ nodes: [makeNode('n1'), makeNode('n2')] });
        const edge = createEdge('e1', 'ws-1', 'n1', 'n2');
        useCanvasStore.getState().setEdges([edge]);

        const { getByRole } = render(
            <svg>
                <DeletableEdge
                    id="e1"
                    source="n1"
                    target="n2"
                    sourceX={0}
                    sourceY={0}
                    targetX={10}
                    targetY={10}
                    sourcePosition={Position.Top}
                    targetPosition={Position.Bottom}
                />
            </svg>
        );

        const btn = getByRole('button');
        fireEvent.click(btn);

        expect(useCanvasStore.getState().edges).toHaveLength(0);
        const history = useHistoryStore.getState();
        expect(history.undoStack).toHaveLength(1);
        expect(history.undoStack[0]?.type).toBe('deleteEdge');

        // undo brings edge back
        history.dispatch({ type: 'UNDO' });
        expect(useCanvasStore.getState().edges.map((e) => e.id)).toContain('e1');
    });
});