/**
 * usePanToNode Hook
 * Provides a utility to pan/zoom the canvas to a specific node or position.
 * Encapsulates ReactFlow interaction for cleaner components.
 */
import { useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';

interface PanToOptions {
    duration?: number;
    zoom?: number;
}

export function usePanToNode() {
    const { setCenter } = useReactFlow();

    /**
     * Pans the viewport to center on the given position.
     * Accounts for node dimensions to center effectively.
     */
    const panToPosition = useCallback(
        (x: number, y: number, options: PanToOptions = {}) => {
            const { duration = 800, zoom = 1 } = options;

            // Calculate center point of the node
            const centerX = x + DEFAULT_NODE_WIDTH / 2;
            const centerY = y + DEFAULT_NODE_HEIGHT / 2;

            void setCenter(centerX, centerY, { zoom, duration });
        },
        [setCenter]
    );

    return useMemo(() => ({ panToPosition }), [panToPosition]);
}
