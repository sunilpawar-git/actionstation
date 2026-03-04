import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../hooks/useSearch';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

describe('useSearch null safety', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useWorkspaceStore.setState({ workspaces: [], currentWorkspaceId: null });
    });

    it('does not throw when node.data is undefined', () => {
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-broken',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: undefined as unknown as Record<string, unknown>,
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });
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

        expect(() => {
            act(() => { result.current.search('test'); });
        }).not.toThrow();

        expect(result.current.results).toHaveLength(0);
    });
});
