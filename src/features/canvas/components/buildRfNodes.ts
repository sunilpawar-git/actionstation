/**
 * buildRfNodes — Structural sharing for ReactFlow node objects.
 *
 * CRITICAL ARCHITECTURE: ReactFlow's StoreUpdater diffs the nodes array on
 * every render. If it sees new objects, it fires internal effects that can
 * cascade back into React state updates, causing "Maximum update depth exceeded".
 *
 * To break this cycle, we pass a STABLE data shell to ReactFlow. The shell only
 * contains the node `id` — IdeaCard reads its own content directly from the
 * Zustand store. This means content/color/tag/pin changes NEVER cause a
 * ReactFlow diff. Only structural changes (position, dimensions, selection)
 * produce new RF node objects.
 *
 * Pin-drag prevention is handled by adding the `nodrag` CSS class on the
 * IdeaCard wrapper when isPinned, combined with ReactFlow's `noDragClassName`
 * prop on CanvasView. Global interaction disabling (focus/lock) uses
 * ReactFlow's `nodesDraggable` prop. Neither approach requires per-node
 * `draggable` in RF objects, avoiding mass object re-creation.
 */
import type { Node } from '@xyflow/react';
import type { MutableRefObject } from 'react';
import type { CanvasNode, NodePosition } from '../types/node';

export interface PrevRfNodes { arr: Node[]; map: Map<string, Node> }

/** Stable data shells keyed by node id — reused across renders */
const dataShellCache = new Map<string, { id: string }>();

function getDataShell(nodeId: string): { id: string } {
    let shell = dataShellCache.get(nodeId);
    if (!shell) {
        shell = { id: nodeId };
        dataShellCache.set(nodeId, shell);
    }
    return shell;
}

export function cleanupDataShells(activeIds: Set<string>): void {
    for (const key of dataShellCache.keys()) {
        if (!activeIds.has(key)) dataShellCache.delete(key);
    }
}

export function buildRfNodes(
    nodes: CanvasNode[],
    selectedNodeIds: Set<string>,
    ref: MutableRefObject<PrevRfNodes>,
    positionOverrides?: ReadonlyMap<string, NodePosition>,
): Node[] {
    const { arr: prevArr, map: prevMap } = ref.current;
    let allReused = nodes.length === prevArr.length;

    const result = nodes.map((node, index) => {
        const selected = selectedNodeIds.has(node.id);
        const position = positionOverrides?.get(node.id) ?? node.position;
        const prev = prevMap.get(node.id);

        if (prev
            && prev.position === position
            && prev.selected === selected
            && prev.width === node.width
            && prev.height === node.height) {
            if (prevArr[index] !== prev) allReused = false;
            return prev;
        }

        allReused = false;
        return {
            id: node.id,
            type: node.type,
            position,
            data: getDataShell(node.id),
            selected,
            ...(node.width != null && { width: node.width }),
            ...(node.height != null && { height: node.height }),
        };
    });

    if (allReused) return prevArr;

    ref.current = { arr: result, map: new Map(result.map((n) => [n.id, n])) };
    return result;
}
