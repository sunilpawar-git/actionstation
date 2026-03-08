/**
 * useUndoableActions — Wraps canvas actions with undo/redo support.
 * Bridge between UI actions and the isolated historyStore.
 * All closures use fresh getState() to avoid stale references.
 *
 * Memory ceiling: Each command captures structuredClone'd nodes + edges.
 * With MAX_HISTORY_DEPTH = 50 and ~20 nodes per batch-delete, worst case
 * is ~1000 cloned nodes in memory. This is bounded and acceptable for
 * a session-scoped history that clears on workspace switch.
 */
import { useCallback } from 'react';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { useHistoryStore } from '../stores/historyStore';
import { withUndo, pushCmd } from '../utils/historyUtils';
import { toastWithAction } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { useConfirm } from '@/shared/stores/confirmStore';
import type { CanvasNode } from '../types/node';
import type { CanvasEdge } from '../types/edge';
import type { CanvasCommandType } from '../types/history';

// Re-export so callers that already import from this module keep working
export { withUndo, pushCmd };

export function useUndoableActions() {
    const confirm = useConfirm();

    const deleteNodeWithUndo = useCallback(async (nodeIds: string[], edgeIds: string[] = []) => {
        const hc = strings.canvas.history;

        // Bulk threshold: 5+ nodes warrant a confirmation pause
        if (nodeIds.length >= 5) {
            const confirmed = await confirm({
                title: hc.deleteNodesConfirmTitle,
                message: hc.deleteNodesConfirm(nodeIds.length),
                confirmText: hc.deleteNodesConfirmButton,
                isDestructive: true,
            });
            if (!confirmed) return;
        }

        const state = useCanvasStore.getState();
        const nodeMap = getNodeMap(state.nodes);

        // Freeze nodes with their Z-index positions
        const frozen = nodeIds
            .map((id) => ({ node: nodeMap.get(id), index: state.nodes.findIndex((n) => n.id === id) }))
            .filter((e): e is { node: CanvasNode; index: number } => e.node != null)
            .map(({ node, index }) => ({ node: structuredClone(node), index }));

        // Freeze all connected edges
        const affectedEdgeIds = new Set(edgeIds);
        state.edges.forEach((e) => {
            if (nodeIds.includes(e.sourceNodeId) || nodeIds.includes(e.targetNodeId)) {
                affectedEdgeIds.add(e.id);
            }
        });
        const frozenEdges: CanvasEdge[] = structuredClone(
            state.edges.filter((e) => affectedEdgeIds.has(e.id))
        );

        const cmdType: CanvasCommandType = nodeIds.length > 1 ? 'batchDelete' : 'deleteNode';
        withUndo(cmdType, () => {
            // EXECUTE / REDO: bulk delete in single set() call
            useCanvasStore.getState().deleteNodes(nodeIds);
        }, () => {
            // UNDO: restore nodes at original Z-index in ONE set() call, then restore orphan-guarded edges
            const sorted = frozen.slice().sort((a, b) => a.index - b.index);
            useCanvasStore.getState().insertNodesAtIndices(sorted);
            const currentNodeIds = new Set(useCanvasStore.getState().nodes.map((n) => n.id));
            frozenEdges.forEach((e) => {
                if (currentNodeIds.has(e.sourceNodeId) && currentNodeIds.has(e.targetNodeId)) {
                    useCanvasStore.getState().addEdge(e);
                }
            });
        });

        // Actionable undo toast — one-click recovery, no keyboard shortcut knowledge required
        const msg = nodeIds.length === 1 ? hc.nodeDeleted : hc.nodesDeleted(nodeIds.length);
        toastWithAction(msg, 'info', {
            label: strings.common.undo,
            onClick: () => useHistoryStore.getState().dispatch({ type: 'UNDO', source: 'toast' }),
        });
    }, [confirm]);

    const addNodeWithUndo = useCallback((node: CanvasNode) => {
        withUndo('addNode', () => {
            useCanvasStore.getState().addNode(structuredClone(node));
        }, () => {
            useCanvasStore.getState().deleteNode(node.id);
        });
    }, []);

    return { deleteNodeWithUndo, addNodeWithUndo };
}
