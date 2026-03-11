/**
 * useCanvasDragHandlers — Extracts drag-related callbacks from CanvasViewInner
 * to keep the component within the 100-line limit.
 */
import { useCallback, useRef } from 'react';
import type { Node } from '@xyflow/react';
import { useDragBatch } from './useDragBatch';

interface DragHandlers {
    historyDragStart: (event: React.MouseEvent, node: Node, nodes: Node[]) => void;
    handleNodeDragStop: (event: React.MouseEvent, node: Node, nodes: Node[]) => void;
    handleSelectionDragStart: (event: React.MouseEvent, nodes: Node[]) => void;
    handleSelectionDragStop: (event: React.MouseEvent, nodes: Node[]) => void;
}

export function useCanvasDragHandlers(commitDragOverrides: () => void): DragHandlers {
    const { onNodeDragStart: historyDragStart, onNodeDragStop: historyDragStop } = useDragBatch();
    const historyDragStopRef = useRef(historyDragStop);
    historyDragStopRef.current = historyDragStop;

    const handleNodeDragStop = useCallback(
        (...args: Parameters<typeof historyDragStop>) => {
            commitDragOverrides();
            historyDragStopRef.current(...args);
        },
        [commitDragOverrides],
    );

    const handleSelectionDragStart = useCallback(
        (event: React.MouseEvent, nodes: Node[]) => {
            const dummy = nodes[0] ?? ({ id: '', position: { x: 0, y: 0 }, data: {} } as Node);
            historyDragStart(event, dummy, nodes);
        },
        [historyDragStart],
    );

    const handleSelectionDragStop = useCallback(
        (event: React.MouseEvent, nodes: Node[]) => {
            const dummy = nodes[0] ?? ({ id: '', position: { x: 0, y: 0 }, data: {} } as Node);
            commitDragOverrides();
            historyDragStopRef.current(event, dummy, nodes);
        },
        [commitDragOverrides],
    );

    return { historyDragStart, handleNodeDragStop, handleSelectionDragStart, handleSelectionDragStop };
}
