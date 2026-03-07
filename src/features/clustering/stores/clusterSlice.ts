/** Cluster store slice — cluster group state composed into canvasStore */
import type { ClusterGroup } from '../types/cluster';

export interface ClusterSlice {
    clusterGroups: readonly ClusterGroup[];
    setClusterGroups: (groups: ClusterGroup[]) => void;
    clearClusterGroups: () => void;
    pruneDeletedNodes: (existingNodeIds: ReadonlySet<string>) => void;
}

export function createClusterSlice(
    set: (partial: Partial<ClusterSlice> | ((state: ClusterSlice) => Partial<ClusterSlice>)) => void,
): ClusterSlice {
    return {
        clusterGroups: [],

        setClusterGroups: (groups) => set({ clusterGroups: groups }),

        clearClusterGroups: () => set({ clusterGroups: [] }),

        pruneDeletedNodes: (existingNodeIds) =>
            set((state) => ({
                clusterGroups: state.clusterGroups
                    .map((g) => ({
                        ...g,
                        nodeIds: g.nodeIds.filter((id) => existingNodeIds.has(id)),
                    }))
                    .filter((g) => g.nodeIds.length >= 2),
            })),
    };
}
