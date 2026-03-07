import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { computeClusters } from '../services/similarityService';
import type { CanvasNode } from '@/features/canvas/types/node';

let posCounter = 0;
function makeNode(id: string, heading: string, output = ''): CanvasNode {
    const offset = posCounter++ * 100;
    return {
        id,
        workspaceId: 'w1',
        type: 'idea',
        data: { heading, output },
        position: { x: offset, y: offset },
        width: 200,
        height: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as CanvasNode;
}

beforeEach(() => {
    posCounter = 0;
    useCanvasStore.getState().clearClusterGroups();
    useCanvasStore.getState().setNodes([]);
});

describe('clustering integration', () => {
    it('full flow: compute -> accept -> store', () => {
        const nodes = [
            makeNode('n1', 'react component rendering virtual dom hooks'),
            makeNode('n2', 'react hooks state virtual dom management'),
            makeNode('n3', 'react component lifecycle virtual dom'),
            makeNode('n4', 'database schema design postgresql queries'),
            makeNode('n5', 'database queries optimization postgresql schema'),
        ];
        useCanvasStore.getState().setNodes(nodes);

        const result = computeClusters(nodes, { similarityThreshold: 0.05 });
        expect(result.clusters.length).toBeGreaterThanOrEqual(1);

        useCanvasStore.getState().setClusterGroups(result.clusters);
        expect(useCanvasStore.getState().clusterGroups.length).toBeGreaterThanOrEqual(1);
    });

    it('clear clusters removes all groups', () => {
        useCanvasStore.getState().setClusterGroups([
            { id: 'c1', nodeIds: ['n1', 'n2'], label: 'Test', colorIndex: 0 },
        ]);
        useCanvasStore.getState().clearClusterGroups();
        expect(useCanvasStore.getState().clusterGroups).toHaveLength(0);
    });

    it('delete node prunes cluster via canvasStore action', () => {
        const nodes = [makeNode('n1', 'a'), makeNode('n2', 'b'), makeNode('n3', 'c')];
        useCanvasStore.getState().setNodes(nodes);
        useCanvasStore.getState().setClusterGroups([
            { id: 'c1', nodeIds: ['n1', 'n2', 'n3'], label: 'Test', colorIndex: 0 },
        ]);

        useCanvasStore.getState().deleteNode('n1');

        const groups = useCanvasStore.getState().clusterGroups;
        expect(groups).toHaveLength(1);
        expect(groups[0]!.nodeIds).not.toContain('n1');
        expect(groups[0]!.nodeIds).toContain('n2');
    });

    it('cluster with all nodes deleted is removed entirely', () => {
        const nodes = [makeNode('n1', 'a'), makeNode('n2', 'b')];
        useCanvasStore.getState().setNodes(nodes);
        useCanvasStore.getState().setClusterGroups([
            { id: 'c1', nodeIds: ['n1', 'n2'], label: 'Test', colorIndex: 0 },
        ]);

        useCanvasStore.getState().deleteNode('n1');
        useCanvasStore.getState().deleteNode('n2');

        expect(useCanvasStore.getState().clusterGroups).toHaveLength(0);
    });

});
