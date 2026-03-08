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

/** Field weights for composite scoring: heading > prompt (legacy) > output > tag */
const FIELD_WEIGHTS = { heading: 1.0, prompt: 1.0, output: 0.8, tag: 0.6 } as const;

/** Mild recency boost: rewards recently updated nodes */
function recencyBoost(node: { updatedAt?: Date; createdAt?: Date }): number {
    const ts = node.updatedAt ?? node.createdAt;
    if (!ts) return 0.9;
    const age = Date.now() - new Date(ts as string | number | Date).getTime();
    if (age < 7 * 86_400_000) return 1.0; // last 7 days
    if (age < 30 * 86_400_000) return 0.95; // last 30 days
    return 0.9;
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

    const results = useMemo((): SearchResult[] => {
        const query = deferredQuery;
        const filtered = applyFilters(nodes, edges, filters);

        if (!query.trim()) {
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

        // Composite scoring: fuzzyScore × fieldWeight × recencyBoost
        const searchResults: SearchResult[] = [];
        for (const node of filtered) {
            const boost = recencyBoost(node);
            const wsName = workspaceMap.get(node.workspaceId) ?? '';

            /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defense-in-depth */
            const heading = node.data?.heading;
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            const prompt = node.data?.prompt;
            const output = node.data?.output;
            const tags = node.data?.tags;
            /* eslint-enable @typescript-eslint/no-unnecessary-condition */

            let bestResult: SearchResult | null = null;
            let bestScore = 0;

            // Heading match (fieldWeight=1.0)
            if (heading?.trim()) {
                const fm = fuzzyMatch(query, heading);
                if (fm.matches) {
                    const score = fm.score * FIELD_WEIGHTS.heading * boost;
                    if (score > bestScore) {
                        bestScore = score;
                        bestResult = {
                            nodeId: node.id, workspaceId: node.workspaceId, workspaceName: wsName,
                            matchedContent: extractSnippet(heading, fm.ranges),
                            matchType: 'heading', relevance: score, highlightRanges: fm.ranges,
                        };
                    }
                }
            } else if (prompt?.trim()) {
                // Legacy prompt fallback (backward compat)
                const fm = fuzzyMatch(query, prompt);
                if (fm.matches) {
                    const score = fm.score * FIELD_WEIGHTS.prompt * boost;
                    if (score > bestScore) {
                        bestScore = score;
                        bestResult = {
                            nodeId: node.id, workspaceId: node.workspaceId, workspaceName: wsName,
                            matchedContent: extractSnippet(prompt, fm.ranges),
                            matchType: 'prompt', relevance: score, highlightRanges: fm.ranges,
                        };
                    }
                }
            }

            // Output match (fieldWeight=0.8)
            if (output?.trim()) {
                const fm = fuzzyMatch(query, output);
                if (fm.matches) {
                    const score = fm.score * FIELD_WEIGHTS.output * boost;
                    if (score > bestScore) {
                        bestScore = score;
                        bestResult = {
                            nodeId: node.id, workspaceId: node.workspaceId, workspaceName: wsName,
                            matchedContent: extractSnippet(output, fm.ranges),
                            matchType: 'output', relevance: score, highlightRanges: fm.ranges,
                        };
                    }
                }
            }

            // Tag match (fieldWeight=0.6)
            if (tags?.length) {
                for (const tag of tags) {
                    const fm = fuzzyMatch(query, tag);
                    if (fm.matches) {
                        const score = fm.score * FIELD_WEIGHTS.tag * boost;
                        if (score > bestScore) {
                            bestScore = score;
                            bestResult = {
                                nodeId: node.id, workspaceId: node.workspaceId, workspaceName: wsName,
                                matchedContent: tag,
                                matchType: 'tag', relevance: score, highlightRanges: fm.ranges,
                            };
                        }
                    }
                }
            }

            if (bestResult) searchResults.push(bestResult);
        }

        return searchResults
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 20); // Pagination cap
    }, [filters, deferredQuery, nodes, edges, workspaceMap]);

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
