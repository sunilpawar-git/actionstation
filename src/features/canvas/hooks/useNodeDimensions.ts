/**
 * useNodeDimensions — O(1) per-node dimension subscription via useSyncExternalStore.
 *
 * Returns a stable { width, height } object that only changes when
 * the node's actual dimensions change. Position-only changes produce
 * ZERO re-renders.
 */
import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';

export interface NodeDimensions {
    width: number;
    height: number;
}

const DEFAULT_DIMS: NodeDimensions = { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };

export function useNodeDimensions(nodeId: string): NodeDimensions {
    const cachedRef = useRef<NodeDimensions>(DEFAULT_DIMS);

    const getSnapshot = useCallback((): NodeDimensions => {
        const node = getNodeMap(useCanvasStore.getState().nodes).get(nodeId);
        const w = node?.width ?? DEFAULT_NODE_WIDTH;
        const h = node?.height ?? DEFAULT_NODE_HEIGHT;
        const prev = cachedRef.current;
        if (prev.width === w && prev.height === h) return prev;
        const next = { width: w, height: h };
        cachedRef.current = next;
        return next;
    }, [nodeId]);

    return useSyncExternalStore(useCanvasStore.subscribe, getSnapshot);
}
