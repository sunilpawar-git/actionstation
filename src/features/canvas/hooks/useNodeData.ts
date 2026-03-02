/**
 * useNodeData — O(1) per-node data subscription via useSyncExternalStore.
 *
 * Compares node.data by reference (Object.is). Position-only changes
 * use { ...node, position }, which preserves node.data by reference,
 * so this hook produces ZERO re-renders during drag.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import type { IdeaNodeData } from '../types/node';

export function useNodeData(nodeId: string): IdeaNodeData | undefined {
    const getSnapshot = useCallback(
        () => getNodeMap(useCanvasStore.getState().nodes).get(nodeId)?.data,
        [nodeId],
    );

    return useSyncExternalStore(useCanvasStore.subscribe, getSnapshot);
}
