/**
 * canvasStoreUtils — Shared utilities and constants for canvas store.
 * Lives in a separate file to avoid circular imports between
 * canvasStore.ts and canvasStoreActions.ts.
 * Must NOT import from @xyflow/react (would break mocked test environments).
 */
import type { CanvasNode } from '../types/node';
import type { InputMode } from '../types/slashCommand';

/** Stable reference for empty selection — prevents spurious re-renders via Object.is */
export const EMPTY_SELECTED_IDS: ReadonlySet<string> = Object.freeze(new Set<string>());

export const DEFAULT_VIEWPORT = { x: 32, y: 32, zoom: 1 };
export const DEFAULT_INPUT_MODE: InputMode = 'note';

let _cachedNodes: CanvasNode[] = [];
let _cachedNodeMap: ReadonlyMap<string, CanvasNode> = new Map();

/** Count nodes with includeInAIPool === true */
export function countPooledNodes(nodes: CanvasNode[]): number {
    let count = 0;
    for (const n of nodes) if (n.data.includeInAIPool) count++;
    return count;
}

/** Count pinned nodes */
export function countPinnedNodes(nodes: CanvasNode[]): number {
    let count = 0;
    for (const n of nodes) if (n.data.isPinned) count++;
    return count;
}

/** Memoized O(1) lookup map — only rebuilds when nodes array reference changes */
export function getNodeMap(nodes: CanvasNode[]): ReadonlyMap<string, CanvasNode> {
    if (nodes !== _cachedNodes) {
        _cachedNodes = nodes;
        _cachedNodeMap = new Map(nodes.map((n) => [n.id, n]));
    }
    return _cachedNodeMap;
}
