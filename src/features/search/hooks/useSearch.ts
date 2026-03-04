/**
 * useSearch Hook - Search across nodes in workspaces
 * BASB: Quick retrieval of captured ideas
 */
import { useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import type { SearchResult } from '../types/search';

interface UseSearchReturn {
    query: string;
    results: SearchResult[];
    search: (query: string) => void;
    clear: () => void;
}


export function useSearch(): UseSearchReturn {
    const [query, setQuery] = useState('');

    const nodes = useCanvasStore((state) => state.nodes);
    const workspaces = useWorkspaceStore((state) => state.workspaces);

    const workspaceMap = useMemo(() => {
        const map = new Map<string, string>();
        workspaces.forEach((ws) => {
            if (ws.type !== 'divider') {
                map.set(ws.id, ws.name);
            }
        });
        return map;
    }, [workspaces]);

    const results = useMemo((): SearchResult[] => {
        if (!query.trim()) {
            return [];
        }

        const searchResults: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        nodes.forEach((node) => {
            /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defense-in-depth for runtime nulls */
            const heading = node.data?.heading;
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            const prompt = node.data?.prompt;
            const output = node.data?.output;
            /* eslint-enable @typescript-eslint/no-unnecessary-condition */
            const workspaceId = node.workspaceId;
            const workspaceName = workspaceMap.get(workspaceId) ?? 'Unknown';

            // Search in heading (SSOT for prompts)
            if (heading && heading.trim().length > 0 && heading.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    nodeId: node.id,
                    workspaceId,
                    workspaceName,
                    matchedContent: heading,
                    matchType: 'heading',
                    relevance: 1.0,
                });
            } else if (prompt && prompt.trim().length > 0 && prompt.toLowerCase().includes(lowerQuery)) {
                // Legacy fallback: search in prompt for old nodes without heading
                searchResults.push({
                    nodeId: node.id,
                    workspaceId,
                    workspaceName,
                    matchedContent: prompt,
                    matchType: 'prompt',
                    relevance: 1.0,
                });
            }

            // Search in output
            if (output?.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    nodeId: node.id,
                    workspaceId,
                    workspaceName,
                    matchedContent: output,
                    matchType: 'output',
                    relevance: 0.8,
                });
            }
        });

        // Sort by relevance
        return searchResults.sort((a, b) => b.relevance - a.relevance);
    }, [query, nodes, workspaceMap]);

    const search = useCallback((newQuery: string) => {
        setQuery(newQuery);
    }, []);

    const clear = useCallback(() => {
        setQuery('');
    }, []);

    return {
        query,
        results,
        search,
        clear,
    };
}
