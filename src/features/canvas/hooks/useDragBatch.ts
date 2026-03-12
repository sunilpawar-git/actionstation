/**
 * useDragBatch — Batches drag operations into single undo entries.
 * Captures ALL dragged node positions on drag start (multi-select aware),
 * records the move on drag stop. Works for both single-node and selection drags.
 *
 * Memory note: Snapshots store only { id, x, y } tuples — negligible overhead.
 */
import { useRef, useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useHistoryStore } from '../stores/historyStore';

type NodeDragHandler = (event: React.MouseEvent, node: Node, nodes: Node[]) => void;

interface PositionEntry {
    readonly id: string;
    readonly x: number;
    readonly y: number;
}

export function useDragBatch() {
    const snapshotRef = useRef<PositionEntry[] | null>(null);

    /** Capture positions of ALL dragged nodes (3rd param includes full selection) */
    const onNodeDragStart: NodeDragHandler = useCallback((_event, _node, draggedNodes) => {
        snapshotRef.current = draggedNodes.map((n) => ({
            id: n.id,
            x: n.position.x,
            y: n.position.y,
        }));
    }, []);

    const onNodeDragStop: NodeDragHandler = useCallback((_event, _node, draggedNodes) => {
        const startPositions = snapshotRef.current;
        if (!startPositions || startPositions.length === 0) return;
        snapshotRef.current = null;

        // Build end positions from the same set of nodes
        const endPositions: PositionEntry[] = draggedNodes.map((n) => ({
            id: n.id,
            x: n.position.x,
            y: n.position.y,
        }));

        // Skip if no node actually moved (click without drag)
        const startMap = new Map(startPositions.map((p) => [p.id, p]));
        const hasMoved = endPositions.some((end) => {
            const start = startMap.get(end.id);
            return start && (start.x !== end.x || start.y !== end.y);
        });
        if (!hasMoved) return;

        // Freeze copies for closures (flat objects — spread is sufficient)
        const frozenStart = startPositions.map((p) => ({ ...p }));
        const frozenEnd = endPositions.map((p) => ({ ...p }));

        // entityId for coalescing: single node → its ID, multi → undefined (no coalescing)
        const entityId = frozenStart.length === 1 ? frozenStart[0]?.id : undefined;

        useHistoryStore.getState().dispatch({
            type: 'PUSH',
            command: {
                type: 'moveNode',
                timestamp: Date.now(),
                entityId,
                undo: () => {
                    const startIds = new Map(frozenStart.map((p) => [p.id, p]));
                    useCanvasStore.getState().setNodes(
                        useCanvasStore.getState().nodes.map((n) => {
                            const pos = startIds.get(n.id);
                            return pos ? { ...n, position: { x: pos.x, y: pos.y } } : n;
                        })
                    );
                },
                redo: () => {
                    const endIds = new Map(frozenEnd.map((p) => [p.id, p]));
                    useCanvasStore.getState().setNodes(
                        useCanvasStore.getState().nodes.map((n) => {
                            const pos = endIds.get(n.id);
                            return pos ? { ...n, position: { x: pos.x, y: pos.y } } : n;
                        })
                    );
                },
            },
        });
    }, []);

    return { onNodeDragStart, onNodeDragStop };
}
