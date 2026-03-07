import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import type { ClusterGroup } from '../../types/cluster';

const CLUSTER_A: ClusterGroup = {
    id: 'cluster-a',
    nodeIds: ['n1', 'n2', 'n3'],
    label: 'Cluster A',
    colorIndex: 0,
};

const CLUSTER_B: ClusterGroup = {
    id: 'cluster-b',
    nodeIds: ['n4', 'n5'],
    label: 'Cluster B',
    colorIndex: 1,
};

describe('clusterSlice', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearClusterGroups();
    });

    it('has empty clusterGroups in initial state', () => {
        const groups = useCanvasStore.getState().clusterGroups;
        expect(groups).toEqual([]);
    });

    it('setClusterGroups replaces cluster state atomically', () => {
        useCanvasStore.getState().setClusterGroups([CLUSTER_A, CLUSTER_B]);
        const groups = useCanvasStore.getState().clusterGroups;
        expect(groups).toHaveLength(2);
        expect(groups[0]).toEqual(CLUSTER_A);
        expect(groups[1]).toEqual(CLUSTER_B);
    });

    it('clearClusterGroups resets to empty array', () => {
        useCanvasStore.getState().setClusterGroups([CLUSTER_A]);
        useCanvasStore.getState().clearClusterGroups();
        expect(useCanvasStore.getState().clusterGroups).toEqual([]);
    });

    it('pruneDeletedNodes removes stale nodeIds from all clusters', () => {
        useCanvasStore.getState().setClusterGroups([CLUSTER_A, CLUSTER_B]);
        const existing = new Set(['n1', 'n2', 'n4', 'n5']);
        useCanvasStore.getState().pruneDeletedNodes(existing);

        const groups = useCanvasStore.getState().clusterGroups;
        expect(groups).toHaveLength(2);
        expect(groups[0]!.nodeIds).toEqual(['n1', 'n2']);
        expect(groups[1]!.nodeIds).toEqual(['n4', 'n5']);
    });

    it('pruneDeletedNodes removes clusters that drop below 2 nodes', () => {
        useCanvasStore.getState().setClusterGroups([CLUSTER_A, CLUSTER_B]);
        const existing = new Set(['n1', 'n2', 'n3', 'n4']);
        useCanvasStore.getState().pruneDeletedNodes(existing);

        const groups = useCanvasStore.getState().clusterGroups;
        expect(groups).toHaveLength(1);
        expect(groups[0]!.id).toBe('cluster-a');
    });

    it('cluster state accessible via getState selector pattern', () => {
        useCanvasStore.getState().setClusterGroups([CLUSTER_A]);
        const { clusterGroups } = useCanvasStore.getState();
        expect(clusterGroups).toHaveLength(1);
        expect(clusterGroups[0]!.id).toBe('cluster-a');
    });
});
