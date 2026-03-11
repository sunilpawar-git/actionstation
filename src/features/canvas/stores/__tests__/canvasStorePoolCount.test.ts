/**
 * Unit tests for poolCount — derived scalar tracked in the canvas store.
 * Prevents O(N) reduce selectors in components.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode } from '../../types/node';
import type { CanvasEdge } from '../../types/edge';

function makeNode(id: string, pooled = false): CanvasNode {
    return {
        id, workspaceId: 'ws-1', type: 'idea',
        position: { x: 0, y: 0 },
        data: { includeInAIPool: pooled } as CanvasNode['data'],
        createdAt: new Date(), updatedAt: new Date(),
    };
}

describe('canvasStore poolCount', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [], edges: [], poolCount: 0, pinnedCount: 0,
        });
    });

    it('initial poolCount is 0', () => {
        expect(useCanvasStore.getState().poolCount).toBe(0);
    });

    it('setNodes recomputes poolCount from incoming array', () => {
        useCanvasStore.getState().setNodes([
            makeNode('a', true), makeNode('b', false), makeNode('c', true),
        ]);
        expect(useCanvasStore.getState().poolCount).toBe(2);
    });

    it('toggleNodePoolMembership increments poolCount', () => {
        useCanvasStore.getState().setNodes([makeNode('a', false)]);
        expect(useCanvasStore.getState().poolCount).toBe(0);

        useCanvasStore.getState().toggleNodePoolMembership('a');
        expect(useCanvasStore.getState().poolCount).toBe(1);
    });

    it('toggleNodePoolMembership decrements poolCount', () => {
        useCanvasStore.getState().setNodes([makeNode('a', true)]);
        expect(useCanvasStore.getState().poolCount).toBe(1);

        useCanvasStore.getState().toggleNodePoolMembership('a');
        expect(useCanvasStore.getState().poolCount).toBe(0);
    });

    it('clearAllNodePool resets poolCount to 0', () => {
        useCanvasStore.getState().setNodes([makeNode('a', true), makeNode('b', true)]);
        expect(useCanvasStore.getState().poolCount).toBe(2);

        useCanvasStore.getState().clearAllNodePool();
        expect(useCanvasStore.getState().poolCount).toBe(0);
    });

    it('deleteNode decrements poolCount if deleted node was pooled', () => {
        useCanvasStore.getState().setNodes([makeNode('a', true), makeNode('b', false)]);
        expect(useCanvasStore.getState().poolCount).toBe(1);

        useCanvasStore.getState().deleteNode('a');
        expect(useCanvasStore.getState().poolCount).toBe(0);
    });

    it('deleteNode does not change poolCount if deleted node was not pooled', () => {
        useCanvasStore.getState().setNodes([makeNode('a', true), makeNode('b', false)]);
        useCanvasStore.getState().deleteNode('b');
        expect(useCanvasStore.getState().poolCount).toBe(1);
    });

    it('clearCanvas resets poolCount to 0', () => {
        useCanvasStore.getState().setNodes([makeNode('a', true)]);
        useCanvasStore.getState().clearCanvas();
        expect(useCanvasStore.getState().poolCount).toBe(0);
    });

    it('addNode increments poolCount when node is pooled', () => {
        useCanvasStore.getState().addNode(makeNode('a', true));
        expect(useCanvasStore.getState().poolCount).toBe(1);
    });

    it('addNode does not change poolCount when node is not pooled', () => {
        useCanvasStore.getState().addNode(makeNode('a', false));
        expect(useCanvasStore.getState().poolCount).toBe(0);
    });

    it('addNodeAndEdge increments poolCount when node is pooled', () => {
        const edge = { id: 'e1', workspaceId: 'ws-1', sourceNodeId: 'x', targetNodeId: 'a' };
        useCanvasStore.getState().addNodeAndEdge(makeNode('a', true), edge as CanvasEdge);
        expect(useCanvasStore.getState().poolCount).toBe(1);
    });

    it('duplicateNode increments poolCount when source was pooled', () => {
        useCanvasStore.getState().setNodes([makeNode('a', true)]);
        expect(useCanvasStore.getState().poolCount).toBe(1);
        useCanvasStore.getState().duplicateNode('a');
        expect(useCanvasStore.getState().poolCount).toBe(2);
    });

    it('insertNodeAtIndex updates poolCount', () => {
        useCanvasStore.getState().setNodes([makeNode('a', false)]);
        useCanvasStore.getState().insertNodeAtIndex(makeNode('b', true), 0);
        expect(useCanvasStore.getState().poolCount).toBe(1);
    });

    it('insertNodesAtIndices updates poolCount', () => {
        useCanvasStore.getState().setNodes([]);
        useCanvasStore.getState().insertNodesAtIndices([
            { node: makeNode('a', true), index: 0 },
            { node: makeNode('b', true), index: 1 },
        ]);
        expect(useCanvasStore.getState().poolCount).toBe(2);
    });

    it('addNode increments pinnedCount when node is pinned', () => {
        const pinned = makeNode('p', false);
        pinned.data = { ...pinned.data, isPinned: true } as CanvasNode['data'];
        useCanvasStore.getState().addNode(pinned);
        expect(useCanvasStore.getState().pinnedCount).toBe(1);
    });

    it('insertNodeAtIndex updates pinnedCount', () => {
        const pinned = makeNode('p', false);
        pinned.data = { ...pinned.data, isPinned: true } as CanvasNode['data'];
        useCanvasStore.getState().insertNodeAtIndex(pinned, 0);
        expect(useCanvasStore.getState().pinnedCount).toBe(1);
    });
});
