/**
 * DeletableEdge — undo behaviour tests
 *
 * Covers: edge is deleted on button click, PUSH is dispatched, undo toast
 * fires, undo restores the edge (orphan-guarded), redo removes it again.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeletableEdge } from '../DeletableEdge';
import { useCanvasStore } from '../../../stores/canvasStore';
import { useHistoryStore } from '../../../stores/historyStore';
import type { CanvasNode } from '../../../types/node';
import type { CanvasEdge } from '../../../types/edge';
import type { EdgeProps, Position } from '@xyflow/react';

// ----- mocks ----------------------------------------------------------------

vi.mock('@/shared/services/analyticsService', () => ({
    trackCanvasUndo: vi.fn(),
    trackCanvasRedo: vi.fn(),
}));

const mockToastWithAction = vi.fn();
vi.mock('@/shared/stores/toastStore', () => ({
    toastWithAction: (...args: unknown[]) => mockToastWithAction(...args),
}));

vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: vi.fn((selector?: (s: { connectorStyle: string }) => unknown) => {
        const s = { connectorStyle: 'solid' };
        return typeof selector === 'function' ? selector(s) : s;
    }),
}));

vi.mock('./DeletableEdge.module.css', () => ({
    default: {
        deleteButtonWrapper: 'deleteButtonWrapper',
        visible: 'visible',
        deleteButton: 'deleteButton',
        edgeSolid: 'edgeSolid',
    },
}));

// ReactFlow components used by DeletableEdge
vi.mock('@xyflow/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@xyflow/react')>();
    return {
        ...actual,
        getBezierPath: () => ['M0 0 L100 100', 50, 50] as [string, number, number],
        BaseEdge: ({ id }: { id: string }) => <path data-testid={`base-edge-${id}`} />,
        EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

// ----- helpers --------------------------------------------------------------

function makeNode(id: string): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        position: { x: 0, y: 0 },
        data: { prompt: '', output: '', tags: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function makeEdge(id: string, source: string, target: string): CanvasEdge {
    return { id, workspaceId: 'ws-1', sourceNodeId: source, targetNodeId: target, relationshipType: 'related' };
}

function buildProps(id: string): EdgeProps {
    return {
        id,
        source: 'n1',
        target: 'n2',
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        sourcePosition: 'right' as Position,
        targetPosition: 'left' as Position,
        selected: false,
        animated: false,
        markerStart: undefined,
        markerEnd: undefined,
        style: {},
        data: {},
        label: undefined,
        labelStyle: undefined,
        labelShowBg: undefined,
        labelBgStyle: undefined,
        labelBgPadding: undefined,
        labelBgBorderRadius: undefined,
        interactionWidth: undefined,
    };
}

// ----- tests ----------------------------------------------------------------

describe('DeletableEdge — undo wiring', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });
        vi.clearAllMocks();
    });

    function setup() {
        const n1 = makeNode('n1');
        const n2 = makeNode('n2');
        const edge = makeEdge('e1', 'n1', 'n2');
        useCanvasStore.getState().setNodes([n1, n2]);
        useCanvasStore.getState().setEdges([edge]);

        render(<DeletableEdge {...buildProps('e1')} />);

        // Hover to reveal the delete button
        const interaction = screen.getByTestId('edge-interaction');
        fireEvent.mouseEnter(interaction);

        return { edge };
    }

    it('delete button removes the edge from canvas', () => {
        setup();
        fireEvent.click(screen.getByRole('button'));
        expect(useCanvasStore.getState().edges).toHaveLength(0);
    });

    it('delete button pushes a deleteEdge command to historyStore', () => {
        setup();
        fireEvent.click(screen.getByRole('button'));
        expect(useHistoryStore.getState().undoStack).toHaveLength(1);
        expect(useHistoryStore.getState().undoStack[0]!.type).toBe('deleteEdge');
    });

    it('shows an actionable undo toast after deleting an edge', () => {
        setup();
        fireEvent.click(screen.getByRole('button'));
        expect(mockToastWithAction).toHaveBeenCalledOnce();
        const [, , action] = mockToastWithAction.mock.calls[0]!;
        expect(action).toMatchObject({ label: expect.any(String) });
    });

    it('undo restores the edge (orphan guard passes — both nodes exist)', () => {
        setup();
        fireEvent.click(screen.getByRole('button'));
        expect(useCanvasStore.getState().edges).toHaveLength(0);

        useHistoryStore.getState().dispatch({ type: 'UNDO' });

        expect(useCanvasStore.getState().edges).toHaveLength(1);
        expect(useCanvasStore.getState().edges[0]!.id).toBe('e1');
    });

    it('undo does NOT restore edge when source node was already deleted (orphan guard)', () => {
        setup();
        fireEvent.click(screen.getByRole('button'));
        // Remove source node so the orphan guard should block restoration
        useCanvasStore.getState().deleteNode('n1');

        useHistoryStore.getState().dispatch({ type: 'UNDO' });

        expect(useCanvasStore.getState().edges).toHaveLength(0);
    });

    it('redo removes the edge again after undo', () => {
        setup();
        fireEvent.click(screen.getByRole('button'));
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        expect(useCanvasStore.getState().edges).toHaveLength(1);

        useHistoryStore.getState().dispatch({ type: 'REDO' });
        expect(useCanvasStore.getState().edges).toHaveLength(0);
    });
});
