/**
 * Search Types - Type definitions for advanced search functionality
 * Phase 8: Extended with filters, highlight ranges, and content-type filtering
 */

export interface SearchResult {
    nodeId: string;
    workspaceId: string;
    workspaceName: string;
    matchedContent: string;
    matchType: 'heading' | 'prompt' | 'output' | 'tag';
    relevance: number;
    highlightRanges: ReadonlyArray<{ start: number; end: number }>;
}

export interface SearchFilters {
    tags?: string[];
    dateRange?: { from: Date | null; to: Date | null };
    contentType?: ContentTypeFilter;
    workspaceId?: string;
}

export type ContentTypeFilter =
    | 'all'
    | 'hasOutput'
    | 'hasAttachments'
    | 'hasConnections'
    | 'noOutput';

/** Type guard: at least one filter is active */
export function hasActiveFilters(f: SearchFilters): boolean {
    if ((f.tags?.length ?? 0) > 0) return true;
    if (f.dateRange?.from != null) return true;
    if (f.dateRange?.to != null) return true;
    if (f.contentType != null && f.contentType !== 'all') return true;
    if (f.workspaceId != null) return true;
    return false;
}

