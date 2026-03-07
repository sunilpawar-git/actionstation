/**
 * Integration Test: Double-Load Guard
 * Verifies that useWorkspaceLoader skips redundant setState when
 * useWorkspaceSwitcher has already applied the same cached data.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkspaceLoader } from '../hooks/useWorkspaceLoader';

const mockLoadNodes = vi.fn();
const mockLoadEdges = vi.fn();
vi.mock('../services/workspaceService', () => ({
    loadNodes: (...args: unknown[]) => mockLoadNodes(...args),
    loadEdges: (...args: unknown[]) => mockLoadEdges(...args),
}));

const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock('../services/workspaceCache', () => ({
    workspaceCache: {
        get: (...args: unknown[]) => mockCacheGet(...args),
        set: (...args: unknown[]) => mockCacheSet(...args),
        update: vi.fn(),
        has: vi.fn(),
        invalidate: vi.fn(),
        clear: vi.fn(),
        preload: vi.fn(),
    },
}));

const mockIsOnline = vi.fn().mockReturnValue(true);
vi.mock('@/shared/stores/networkStatusStore', () => ({
    useNetworkStatusStore: Object.assign(
        vi.fn(() => ({ isOnline: mockIsOnline() })),
        { getState: () => ({ isOnline: mockIsOnline() }) }
    ),
}));

const mockLoadKBEntries = vi.fn().mockResolvedValue([]);
const mockSetKBEntries = vi.fn();
vi.mock('@/features/knowledgeBank/services/knowledgeBankService', () => ({
    loadKBEntries: (...args: unknown[]) => mockLoadKBEntries(...args),
}));
vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: Object.assign(vi.fn(), {
        getState: () => ({ setEntries: mockSetKBEntries }),
    }),
}));

// Mock auth store - must handle selector pattern: useAuthStore((s) => s.user)
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector?: (s: { user: { id: string; email: string } }) => unknown) => {
        const state = { user: { id: 'user-1', email: 'a@b.com' } };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

const cachedNodes = [{ id: 'n1', type: 'idea', data: { prompt: 'P' } }];
const cachedEdges = [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' }];

const mockCanvasSetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn(() => ({})),
        {
            getState: () => ({
                nodes: cachedNodes,
                edges: cachedEdges,
                viewport: { x: 32, y: 32, zoom: 1 },
                editingNodeId: null,
                clearClusterGroups: vi.fn(),
                setClusterGroups: vi.fn(),
                pruneDeletedNodes: vi.fn(),
            }),
            setState: (...args: unknown[]) => mockCanvasSetState(...args),
        }
    ),
    EMPTY_SELECTED_IDS: Object.freeze(new Set<string>()),
}));

vi.mock('../stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(vi.fn(), {
        getState: () => ({ workspaces: [] }),
    }),
}));

describe('Double-load guard integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsOnline.mockReturnValue(true);
        mockLoadNodes.mockResolvedValue(cachedNodes);
        mockLoadEdges.mockResolvedValue([]);
    });

    it('skips setState when cached nodes/edges match store references', async () => {
        mockCacheGet.mockReturnValue({
            nodes: cachedNodes,
            edges: cachedEdges,
            loadedAt: Date.now(),
        });
        mockIsOnline.mockReturnValue(false);

        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(mockCanvasSetState).not.toHaveBeenCalled();
    });

    it('calls setState when cached data differs from store', async () => {
        const differentNodes = [{ id: 'n2', type: 'idea', data: { prompt: 'Q' } }];
        mockCacheGet.mockReturnValue({
            nodes: differentNodes,
            edges: cachedEdges,
            loadedAt: Date.now(),
        });

        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(mockCanvasSetState).toHaveBeenCalledWith(
            expect.objectContaining({ nodes: differentNodes, edges: cachedEdges })
        );
    });

    it('structural: applyIfMounted contains reference equality guard', () => {
        const src = readFileSync(
            resolve(__dirname, '../hooks/useWorkspaceLoader.ts'),
            'utf-8'
        );
        expect(src).toContain('current.nodes === nodes');
        expect(src).toContain('current.edges === edges');
    });
});
