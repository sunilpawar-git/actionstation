import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../hooks/useSearch';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

describe('useSearch interface', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useWorkspaceStore.setState({ workspaces: [], currentWorkspaceId: null });
    });

    it('does not expose isSearching in the return value', () => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useWorkspaceStore.setState({
            currentWorkspaceId: 'ws-1',
            workspaces: [{
                id: 'ws-1',
                userId: 'u1',
                name: 'WS',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(),
                updatedAt: new Date(),
            }],
        });

        const { result } = renderHook(() => useSearch());

        expect(result.current).toHaveProperty('query');
        expect(result.current).toHaveProperty('results');
        expect(result.current).toHaveProperty('search');
        expect(result.current).toHaveProperty('clear');
        expect(result.current).not.toHaveProperty('isSearching');
    });

    it('sets query synchronously when search is called', () => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useWorkspaceStore.setState({
            currentWorkspaceId: 'ws-1',
            workspaces: [{
                id: 'ws-1',
                userId: 'u1',
                name: 'WS',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(),
                updatedAt: new Date(),
            }],
        });

        const { result } = renderHook(() => useSearch());

        act(() => { result.current.search('hello'); });

        expect(result.current.query).toBe('hello');
    });
});
