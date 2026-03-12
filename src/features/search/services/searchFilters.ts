/**
 * Search Filters — Pure predicate functions for filtering canvas nodes.
 * No side effects, no React/store imports. Composable via applyFilters.
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import type { SearchFilters, ContentTypeFilter } from '../types/search';
import { toEpochMs } from '@/shared/utils/dateUtils';

export function matchesTags(node: CanvasNode, tags: string[]): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth: node.data may be undefined in Firestore
    const nodeTags = node.data?.tags ?? [];
    return tags.some((tag) => nodeTags.includes(tag));
}

export function matchesDateRange(node: CanvasNode, from: Date | null, to: Date | null): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth: Firestore may omit updatedAt/createdAt despite the type saying otherwise
    const updated = node.updatedAt ?? node.createdAt;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth: runtime guard for Firestore documents missing this field
    if (updated == null) return true; // Missing timestamp: include the node (safe default)
    const time = toEpochMs(updated);
    if (isNaN(time)) return true; // Security: invalid dates don't crash
    if (from && !isNaN(from.getTime()) && time < from.getTime()) return false;
    if (to && !isNaN(to.getTime()) && time > to.getTime()) return false;
    return true;
}

export function matchesContentType(
    node: CanvasNode,
    filter: ContentTypeFilter,
    edges: CanvasEdge[],
): boolean {
    switch (filter) {
        case 'all': return true;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth
        case 'hasOutput': return Boolean(node.data?.output?.trim());
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth
        case 'hasAttachments': return (node.data?.attachments?.length ?? 0) > 0;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth
        case 'noOutput': return !node.data?.output?.trim();
        case 'hasConnections':
            return edges.some((e) => e.sourceNodeId === node.id || e.targetNodeId === node.id);
    }
}

export function applyFilters(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    filters: SearchFilters,
): CanvasNode[] {
    return nodes.filter((node) => {
        if (filters.tags?.length && !matchesTags(node, filters.tags)) return false;
        if (filters.dateRange && !matchesDateRange(node, filters.dateRange.from, filters.dateRange.to))
            return false;
        if (filters.contentType && !matchesContentType(node, filters.contentType, edges)) return false;
        if (filters.workspaceId && node.workspaceId !== filters.workspaceId) return false;
        return true;
    });
}
