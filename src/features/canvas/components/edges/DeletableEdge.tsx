/**
 * DeletableEdge - Custom edge with midpoint delete button
 * Renders bezier path with hover-activated delete control
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
    getBezierPath,
    BaseEdge,
    EdgeLabelRenderer,
    type EdgeProps,
} from '@xyflow/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useSettingsStore, type ConnectorStyle } from '@/shared/stores/settingsStore';
import { toastWithAction } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { safeClone } from '@/shared/utils/safeClone';
import styles from './DeletableEdge.module.css';

/** Deletes an edge, pushes undo command, and shows an actionable undo toast. */
function deleteEdgeWithUndo(id: string): void {
    const state = useCanvasStore.getState();
    const edge = state.edges.find((e) => e.id === id);
    if (!edge) return;
    const frozenEdge = safeClone(edge);
    state.deleteEdge(id);
    useHistoryStore.getState().dispatch({
        type: 'PUSH',
        command: {
            type: 'deleteEdge',
            timestamp: Date.now(),
            undo: () => {
                const currentNodeIds = new Set(
                    useCanvasStore.getState().nodes.map((n) => n.id)
                );
                if (
                    currentNodeIds.has(frozenEdge.sourceNodeId) &&
                    currentNodeIds.has(frozenEdge.targetNodeId)
                ) {
                    useCanvasStore.getState().addEdge(frozenEdge);
                }
            },
            redo: () => {
                useCanvasStore.getState().deleteEdge(id);
            },
        },
    });
    toastWithAction(strings.canvas.history.edgeDeleted, 'info', {
        label: strings.common.undo,
        onClick: () => useHistoryStore.getState().dispatch({ type: 'UNDO', source: 'toast' }),
    });
}

/**
 * Returns dynamic CSS class name based on the chosen ConnectorStyle.
 */
function getEdgeClassName(styleOption: ConnectorStyle): string {
    switch (styleOption) {
        case 'subtle':
            return styles.edgeSubtle ?? '';
        case 'thick':
            return styles.edgeThick ?? '';
        case 'dashed':
            return styles.edgeDashed ?? '';
        case 'dotted':
            return styles.edgeDotted ?? '';
        case 'solid':
        default:
            return styles.edgeSolid ?? '';
    }
}

export const DeletableEdge = React.memo(function DeletableEdge({
    id,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    markerEnd,
    style,
}: EdgeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const connectorStyle = useSettingsStore((s) => s.connectorStyle);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const handleDelete = useCallback(() => { deleteEdgeWithUndo(id); }, [id]);

    const handleMouseEnter = useCallback(() => setIsHovered(true), []);
    const handleMouseLeave = useCallback(() => setIsHovered(false), []);

    const edgeClass = getEdgeClassName(connectorStyle);
    const labelStyle = useMemo(
        () => ({ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }),
        [labelX, labelY],
    );

    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} className={edgeClass} />
            {/* Wider invisible path for hover detection */}
            <path
                d={edgePath}
                fill="none"
                strokeWidth={20}
                stroke="transparent"
                className="react-flow__edge-interaction"
                data-testid="edge-interaction"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />
            <EdgeLabelRenderer>
                <div
                    className={`${styles.deleteButtonWrapper} ${isHovered ? styles.visible : ''} nodrag nopan`}
                    style={labelStyle}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <button
                        className={styles.deleteButton}
                        onClick={handleDelete}
                        aria-label={strings.edge.deleteConnection}
                        type="button"
                    >
                        {'\u00D7'}
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
});
