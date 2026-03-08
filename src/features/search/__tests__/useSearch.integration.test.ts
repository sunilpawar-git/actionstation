/**
 * useSearch Integration Tests — Full flow with filters + fuzzy
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../hooks/useSearch';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

describe('useSearch integration', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'n1', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'React hooks', tags: ['react'], output: 'useState and useEffect' },
                    position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                {
                    id: 'n2', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'TypeScript basics', tags: ['typescript'], output: 'Types and interfaces' },
                    position: { x: 100, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                {
                    id: 'n3', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'CSS Grid', tags: ['css'], output: '' },
                    position: { x: 200, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });
        useWorkspaceStore.setState({
            currentWorkspaceId: 'ws-1',
            workspaces: [{
                id: 'ws-1', userId: 'user-1', name: 'My Workspace',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(), updatedAt: new Date(),
            }],
        });
    });

    it('full flow: type query → get fuzzy results → apply filter → results narrow', () => {
        const { result } = renderHook(() => useSearch());
        // Search for React
        act(() => { result.current.search('React'); });
        expect(result.current.results.length).toBeGreaterThanOrEqual(1);

        // Apply tag filter — should keep only react-tagged nodes
        act(() => { result.current.setFilters({ tags: ['react'] }); });
        expect(result.current.results.every((r: { nodeId: string }) => r.nodeId === 'n1')).toBe(true);
    });

    it('clear all resets everything', () => {
        const { result } = renderHook(() => useSearch());
        act(() => {
            result.current.search('React');
            result.current.setFilters({ tags: ['react'] });
        });
        act(() => { result.current.clear(); });
        expect(result.current.query).toBe('');
        expect(result.current.results).toHaveLength(0);
        expect(result.current.filters).toEqual({});
    });

    it('filter-only mode (no query) returns all matching nodes', () => {
        const { result } = renderHook(() => useSearch());
        act(() => { result.current.setFilters({ contentType: 'hasOutput' }); });
        // n1 and n2 have output, n3 does not
        expect(result.current.results.length).toBe(2);
    });
});
