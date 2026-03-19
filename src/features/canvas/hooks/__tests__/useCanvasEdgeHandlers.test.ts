import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasEdgeHandlers } from '../useCanvasEdgeHandlers';
import { useCanvasStore } from '../../stores/canvasStore';
import { createIdeaNode } from '../../types/node';
import { createEdge } from '../../types/edge';
import { DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import type { Node } from '@xyflow/react';

const createNode = (id: string, x: number, y: number) =>
    createIdeaNode(id, 'ws-1', { x, y });

const mockNode = (id: string): Node => ({
    id,
    type: 'idea',
    position: { x: 0, y: 0 },
    data: {},
});

describe('useCanvasEdgeHandlers', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [createNode('n1', 0, 0), createNode('n2', 10, 10)],
            edges: [
                createEdge('e1', 'ws-1', 'n1', 'n2'),
                createEdge('e2', 'ws-1', 'n2', 'n1'),
            ],
            selectedNodeIds: new Set(),
        });
    });

    it('returns onEdgesChange, onConnect, onSelectionChange', () => {
        const { result } = renderHook(() =>
            useCanvasEdgeHandlers('ws-1', false)
        );
        expect(typeof result.current.onEdgesChange).toBe('function');
        expect(typeof result.current.onConnect).toBe('function');
        expect(typeof result.current.onSelectionChange).toBe('function');
    });

    describe('onEdgesChange', () => {
        it('does nothing when canvas is locked', () => {
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', true)
            );
            act(() =>
                result.current.onEdgesChange([{ type: 'remove', id: 'e1' }])
            );
            expect(useCanvasStore.getState().edges).toHaveLength(2);
        });

        it('removes edges when unlocked', () => {
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', false)
            );
            act(() =>
                result.current.onEdgesChange([{ type: 'remove', id: 'e1' }])
            );
            const edges = useCanvasStore.getState().edges;
            expect(edges).toHaveLength(1);
            expect(edges[0]!.id).toBe('e2');
        });

        it('ignores non-remove changes', () => {
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', false)
            );
            act(() =>
                result.current.onEdgesChange([{ type: 'select', id: 'e1', selected: true }])
            );
            expect(useCanvasStore.getState().edges).toHaveLength(2);
        });
    });

    describe('onConnect', () => {
        it('does nothing when canvas is locked', () => {
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', true)
            );
            act(() =>
                result.current.onConnect({
                    source: 'n1',
                    target: 'n2',
                    sourceHandle: null,
                    targetHandle: null,
                })
            );
            expect(useCanvasStore.getState().edges).toHaveLength(2);
        });

        it('adds edge when unlocked with source and target', () => {
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', false)
            );
            act(() =>
                result.current.onConnect({
                    source: 'n1',
                    target: 'n2',
                    sourceHandle: null,
                    targetHandle: null,
                })
            );
            const edges = useCanvasStore.getState().edges;
            expect(edges).toHaveLength(3);
            const added = edges.find((e) => e.sourceNodeId === 'n1' && e.targetNodeId === 'n2');
            expect(added).toBeDefined();
            expect(added?.workspaceId).toBe('ws-1');
            expect(added?.relationshipType).toBe('related');
        });

        it('uses DEFAULT_WORKSPACE_ID when currentWorkspaceId is undefined', () => {
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers(null, false)
            );
            act(() =>
                result.current.onConnect({
                    source: 'n1',
                    target: 'n2',
                    sourceHandle: null,
                    targetHandle: null,
                })
            );
            const edges = useCanvasStore.getState().edges;
            const existingIds = new Set(['e1', 'e2']);
            const added = edges.find((e) => !existingIds.has(e.id));
            expect(added).toBeDefined();
            expect(added?.workspaceId).toBe(DEFAULT_WORKSPACE_ID);
        });

        it('does not add edge when source or target missing', () => {
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', false)
            );
            act(() =>
                result.current.onConnect({
                    source: '',
                    target: 'n2',
                    sourceHandle: null,
                    targetHandle: null,
                })
            );
            expect(useCanvasStore.getState().edges).toHaveLength(2);
        });
    });

    describe('onSelectionChange', () => {
        it('allows selection update even when canvas is locked', () => {
            // Lock must NOT block selection — clicking nodes must still work
            // so the F key and context-menu Focus action remain available.
            useCanvasStore.setState({ selectedNodeIds: new Set(['n1']) });
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', true)
            );
            act(() =>
                result.current.onSelectionChange({
                    nodes: [mockNode('n1'), mockNode('n2')],
                    edges: [],
                })
            );
            expect(useCanvasStore.getState().selectedNodeIds.size).toBe(2);
        });

        it('sets selectedNodeIds when nodes selected', () => {
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', false)
            );
            act(() =>
                result.current.onSelectionChange({
                    nodes: [mockNode('n1'), mockNode('n2')],
                    edges: [],
                })
            );
            const selected = useCanvasStore.getState().selectedNodeIds;
            expect(selected.size).toBe(2);
            expect(selected.has('n1')).toBe(true);
            expect(selected.has('n2')).toBe(true);
        });

        it('clears selection when no nodes selected', () => {
            useCanvasStore.setState({ selectedNodeIds: new Set(['n1']) });
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', false)
            );
            act(() =>
                result.current.onSelectionChange({
                    nodes: [],
                    edges: [],
                })
            );
            expect(useCanvasStore.getState().selectedNodeIds.size).toBe(0);
        });

        it('skips setState when selection unchanged', () => {
            const setStateSpy = vi.spyOn(useCanvasStore, 'setState');
            useCanvasStore.setState({ selectedNodeIds: new Set(['n1']) });
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', false)
            );
            setStateSpy.mockClear();
            act(() =>
                result.current.onSelectionChange({
                    nodes: [mockNode('n1')],
                    edges: [],
                })
            );
            expect(setStateSpy).not.toHaveBeenCalled();
        });

        it('skips setState when already empty and selection empty', () => {
            const setStateSpy = vi.spyOn(useCanvasStore, 'setState');
            useCanvasStore.setState({ selectedNodeIds: new Set() });
            const { result } = renderHook(() =>
                useCanvasEdgeHandlers('ws-1', false)
            );
            setStateSpy.mockClear();
            act(() =>
                result.current.onSelectionChange({
                    nodes: [],
                    edges: [],
                })
            );
            expect(setStateSpy).not.toHaveBeenCalled();
        });
    });
});
