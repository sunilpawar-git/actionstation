import { useCallback } from 'react';
import type { EdgeChange, OnEdgesChange, OnConnect, OnSelectionChangeFunc } from '@xyflow/react';
import { useCanvasStore, EMPTY_SELECTED_IDS } from '../stores/canvasStore';
import { useHistoryStore } from '../stores/historyStore';
import { DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import type { CanvasEdge } from '../types/edge';
import { safeClone } from '@/shared/utils/safeClone';
import { generateUUID } from '@/shared/utils/uuid';

function buildEdgeRemovalCommand(frozenEdges: CanvasEdge[]) {
    return {
        type: 'deleteEdge' as const,
        timestamp: Date.now(),
        undo: () => {
            const currentNodeIds = new Set(useCanvasStore.getState().nodes.map((n) => n.id));
            frozenEdges.forEach((e) => {
                if (currentNodeIds.has(e.sourceNodeId) && currentNodeIds.has(e.targetNodeId)) {
                    useCanvasStore.getState().addEdge(e);
                }
            });
        },
        redo: () => {
            frozenEdges.forEach((e) => useCanvasStore.getState().deleteEdge(e.id));
        },
    };
}

function buildConnectionCommand(newEdge: CanvasEdge) {
    const edgeId = newEdge.id;
    const frozenEdge = { ...newEdge };
    return {
        type: 'addEdge' as const,
        timestamp: Date.now(),
        entityId: edgeId,
        undo: () => { useCanvasStore.getState().deleteEdge(edgeId); },
        redo: () => { useCanvasStore.getState().addEdge(frozenEdge); },
    };
}

/**
 * Canvas edge and selection handlers wired to ReactFlow callbacks.
 *
 * @param currentWorkspaceId  Active workspace (used when creating new edges).
 * @param isCanvasLocked      When true, `onEdgesChange` and `onConnect` are
 *   no-ops to prevent structural mutations. `onSelectionChange` is intentionally
 *   NOT guarded by this flag — clicking nodes must still work when locked so
 *   the F key and context-menu "Focus" action remain accessible.
 */
export function useCanvasEdgeHandlers(currentWorkspaceId: string | null, isCanvasLocked: boolean) {
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            if (isCanvasLocked) return;
            const removals = changes.filter((c) => c.type === 'remove');
            if (removals.length === 0) return;

            // Freeze edges before removing for undo support
            const removeIds = new Set(removals.map((c) => c.id));
            const frozenEdges: CanvasEdge[] = safeClone(
                useCanvasStore.getState().edges.filter((e) => removeIds.has(e.id))
            );

            useCanvasStore.setState((state) => {
                const filtered = state.edges.filter((e) => !removeIds.has(e.id));
                return filtered.length !== state.edges.length ? { edges: filtered } : {};
            });

            // Push undo command for each removed edge
            if (frozenEdges.length > 0) {
                useHistoryStore.getState().dispatch({
                    type: 'PUSH',
                    command: buildEdgeRemovalCommand(frozenEdges),
                });
            }
        },
        [isCanvasLocked]
    );

    const onConnect: OnConnect = useCallback(
        (connection) => {
            if (isCanvasLocked) return;
            if (connection.source && connection.target) {
                const newEdge: CanvasEdge = {
                    id: `edge-${generateUUID()}`,
                    workspaceId: currentWorkspaceId ?? DEFAULT_WORKSPACE_ID,
                    sourceNodeId: connection.source,
                    targetNodeId: connection.target,
                    relationshipType: 'related',
                };
                useCanvasStore.getState().addEdge(newEdge);
                useHistoryStore.getState().dispatch({
                    type: 'PUSH',
                    command: buildConnectionCommand(newEdge),
                });
            }
        },
        [currentWorkspaceId, isCanvasLocked]
    );

    const onSelectionChange: OnSelectionChangeFunc = useCallback(
        ({ nodes: selectedNodes }) => {
            // NOTE: selection is intentionally allowed when the canvas is locked.
            // The user must be able to click a node to select it so that the
            // F key and context-menu "Focus" action remain accessible.
            const current = useCanvasStore.getState().selectedNodeIds;
            if (selectedNodes.length === 0) {
                if (current.size === 0) return;
                useCanvasStore.setState({ selectedNodeIds: EMPTY_SELECTED_IDS as Set<string> });
                return;
            }
            const newIds = new Set(selectedNodes.map((n) => n.id));
            if (newIds.size === current.size && [...newIds].every((id) => current.has(id))) return;
            useCanvasStore.setState({ selectedNodeIds: newIds });
        },
        []
    );

    return { onEdgesChange, onConnect, onSelectionChange };
}
