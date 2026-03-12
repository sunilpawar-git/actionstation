/**
 * useSearch Hook - Advanced search across nodes in workspaces
 * BASB: Quick retrieval of captured ideas
 * Phase 8: useReducer + useDeferredValue + fuzzy + composite scoring + filters
 */
import { useReducer, useCallback, useMemo, useDeferredValue } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import type { SearchResult, SearchFilters } from '../types/search';
import { hasActiveFilters } from '../types/search';
import { applyFilters } from '../services/searchFilters';
import { fuzzyMatch, extractSnippet } from '../services/fuzzyMatch';
import { searchReducer, INITIAL_SEARCH_STATE } from './searchReducer';
import { toEpochMs } from '@/shared/utils/dateUtils';

/** Field weights for composite scoring: heading > prompt (legacy) > output > tag */
const FIELD_WEIGHTS = { heading: 1.0, prompt: 1.0, output: 0.8, tag: 0.6 } as const;

/** Mild recency boost: rewards recently updated nodes */
function recencyBoost(node: { updatedAt?: Date; createdAt?: Date }): number {
    const ts = node.updatedAt ?? node.createdAt;
    if (!ts) return 0.9;
    // Firestore may deliver a Timestamp object with toDate(), a Date, or a string/number.
    const epoch = toEpochMs(ts);
    if (Number.isNaN(epoch)) return 0.9;
    const age = Date.now() - epoch;
    if (age < 7 * 86_400_000) return 1.0; // last 7 days
    if (age < 30 * 86_400_000) return 0.95; // last 30 days
    return 0.9;
}

/** Score a single text field against the query. Returns best match or null. */
function scoreField(
    query: string, text: string | undefined, fieldWeight: number, boost: number,
    nodeId: string, workspaceId: string, workspaceName: string,
    matchType: SearchResult['matchType'], useSnippet: boolean,
): { result: SearchResult; score: number } | null {
    if (!text?.trim()) return null;
    const fm = fuzzyMatch(query, text);
    if (!fm.matches) return null;
    const score = fm.score * fieldWeight * boost;
    return {
        score,
        result: {
            nodeId, workspaceId, workspaceName,
            matchedContent: useSnippet ? extractSnippet(text, fm.ranges) : text,
            matchType, relevance: score, highlightRanges: fm.ranges,
        },
    };
}

/** Score node tags against the query. Returns best tag match or null. */
function scoreTags(
    query: string, tags: string[] | undefined, fieldWeight: number, boost: number,
    nodeId: string, workspaceId: string, workspaceName: string,
): { result: SearchResult; score: number } | null {
    if (!tags?.length) return null;
    let best: { result: SearchResult; score: number } | null = null;
    for (const tag of tags) {
        const hit = scoreField(query, tag, fieldWeight, boost, nodeId, workspaceId, workspaceName, 'tag', false);
        if (hit && (!best || hit.score > best.score)) best = hit;
    }
    return best;
}

/** Find the best fuzzy match for a node across all its fields. */
function scoreNode(
    query: string, node: { id: string; workspaceId: string; data?: Record<string, unknown>; updatedAt?: Date; createdAt?: Date },
    boost: number, workspaceName: string,
): SearchResult | null {
    const heading = typeof node.data?.heading === 'string' ? node.data.heading : undefined;
    const prompt = typeof node.data?.prompt === 'string' ? node.data.prompt : undefined;
    const output = typeof node.data?.output === 'string' ? node.data.output : undefined;
    const tags = Array.isArray(node.data?.tags) ? (node.data.tags as string[]) : undefined;

    const candidates = [
        heading?.trim()
            ? scoreField(query, heading, FIELD_WEIGHTS.heading, boost, node.id, node.workspaceId, workspaceName, 'heading', true)
            : scoreField(query, prompt, FIELD_WEIGHTS.prompt, boost, node.id, node.workspaceId, workspaceName, 'prompt', true),
        scoreField(query, output, FIELD_WEIGHTS.output, boost, node.id, node.workspaceId, workspaceName, 'output', true),
        scoreTags(query, tags, FIELD_WEIGHTS.tag, boost, node.id, node.workspaceId, workspaceName),
    ];

    let best: { result: SearchResult; score: number } | null = null;
    for (const c of candidates) {
        if (c && (!best || c.score > best.score)) best = c;
    }
    return best?.result ?? null;
}

/** Build the filtered + scored search results list. Pure function. */
function buildSearchResults(
    deferredQuery: string,
    nodes: ReadonlyArray<{ id: string; workspaceId: string; data?: Record<string, unknown>; updatedAt?: Date; createdAt?: Date }>,
    edges: ReadonlyArray<{ sourceNodeId: string; targetNodeId: string }>,
    filters: SearchFilters,
    workspaceMap: ReadonlyMap<string, string>,
): SearchResult[] {
    const filtered = applyFilters(
        nodes as Parameters<typeof applyFilters>[0],
        edges as Parameters<typeof applyFilters>[1],
        filters,
    );

    if (!deferredQuery.trim()) {
        if (hasActiveFilters(filters)) {
            return filtered.map((node) => ({
                nodeId: node.id,
                workspaceId: node.workspaceId,
                workspaceName: workspaceMap.get(node.workspaceId) ?? '',
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth
                matchedContent: node.data?.heading ?? '',
                matchType: 'heading' as const,
                relevance: 1.0,
                highlightRanges: [],
            }));
        }
        return [];
    }

    const searchResults: SearchResult[] = [];
    for (const node of filtered) {
        const result = scoreNode(deferredQuery, node, recencyBoost(node), workspaceMap.get(node.workspaceId) ?? '');
        if (result) searchResults.push(result);
    }

    return searchResults.sort((a, b) => b.relevance - a.relevance).slice(0, 20);
}

export interface UseSearchReturn {
    query: string;
    filters: SearchFilters;
    activeIndex: number;
    isFilterBarOpen: boolean;
    results: SearchResult[];
    search: (query: string) => void;
    setFilters: (f: Partial<SearchFilters>) => void;
    clearFilters: () => void;
    clear: () => void;
    toggleFilterBar: () => void;
    setActiveIndex: (i: number) => void;
}

export function useSearch(): UseSearchReturn {
    const [state, dispatch] = useReducer(searchReducer, INITIAL_SEARCH_STATE);

    // Read-only selectors — NO store mutations from search
    const nodes = useCanvasStore((s) => s.nodes);
    const edges = useCanvasStore((s) => s.edges);
    const workspaces = useWorkspaceStore((s) => s.workspaces);

    // useDeferredValue defers the expensive O(n·m) fuzzy computation
    const deferredQuery = useDeferredValue(state.query);

    const workspaceMap = useMemo(() => {
        const map = new Map<string, string>();
        workspaces.forEach((ws) => {
            if (ws.type !== 'divider') map.set(ws.id, ws.name);
        });
        return map;
    }, [workspaces]);

    const filters = state.filters;

    const results = useMemo(
        () => buildSearchResults(deferredQuery, nodes, edges, filters, workspaceMap),
        [filters, deferredQuery, nodes, edges, workspaceMap],
    );

    const search = useCallback((q: string) => dispatch({ type: 'SET_QUERY', query: q }), []);
    const setFilters = useCallback((f: Partial<SearchFilters>) => dispatch({ type: 'SET_FILTER', filter: f }), []);
    const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), []);
    const clear = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), []);
    const toggleFilterBar = useCallback(() => dispatch({ type: 'TOGGLE_FILTER_BAR' }), []);
    const setActiveIndex = useCallback((i: number) => dispatch({ type: 'SET_ACTIVE_INDEX', index: i }), []);

    return {
        query: state.query,
        filters: state.filters,
        activeIndex: state.activeIndex,
        isFilterBarOpen: state.isFilterBarOpen,
        results,
        search,
        setFilters,
        clearFilters,
        clear,
        toggleFilterBar,
        setActiveIndex,
    };
}
