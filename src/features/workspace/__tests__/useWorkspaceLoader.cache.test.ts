/**
 * useWorkspaceLoader Cache-First Loading Tests
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
        const state = { user: { id: 'user-1', email: 'test@example.com' } };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

const mockCanvasSetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn(() => ({})),
        {
            getState: () => ({ nodes: [], edges: [], editingNodeId: null, clearClusterGroups: vi.fn(), setClusterGroups: vi.fn(), pruneDeletedNodes: vi.fn() }),
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

describe('useWorkspaceLoader cache-first loading', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockLoadEdges.mockResolvedValue([]);
        mockCacheGet.mockReturnValue(null);
        mockIsOnline.mockReturnValue(true);
    });

    it('loads from cache first when available', async () => {
        const cachedNodes = [{ id: 'cached-node', type: 'idea', data: { prompt: 'Cached' }, createdAt: new Date(), updatedAt: new Date() }];
        const cachedEdges = [{ id: 'cached-edge', sourceNodeId: 'n1', targetNodeId: 'n2' }];
        mockCacheGet.mockReturnValue({
            nodes: cachedNodes,
            edges: cachedEdges,
            loadedAt: Date.now(),
        });

        const { result, unmount } = renderHook(() => useWorkspaceLoader('ws-cached'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        await waitFor(() => expect(mockLoadKBEntries).toHaveBeenCalled());

        expect(mockCanvasSetState).toHaveBeenCalledWith(
            expect.objectContaining({ nodes: cachedNodes, edges: cachedEdges })
        );

        unmount();
        await new Promise((r) => setTimeout(r, 250));
    });

    it('background-refreshes from Firestore after cache hit when online', async () => {
        const cachedNodes = [{ id: 'cached-node' }];
        mockCacheGet.mockReturnValue({
            nodes: cachedNodes,
            edges: [],
            loadedAt: Date.now() - 60000,
        });
        mockIsOnline.mockReturnValue(true);

        const freshNodes = [{ id: 'fresh-node' }];
        mockLoadNodes.mockResolvedValue(freshNodes);
        mockLoadEdges.mockResolvedValue([]);

        const { unmount } = renderHook(() => useWorkspaceLoader('ws-bg'));

        await waitFor(() => {
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-bg');
        });
        await waitFor(() => expect(mockLoadKBEntries).toHaveBeenCalled());

        unmount();
        await new Promise((r) => setTimeout(r, 250));
    });

    it('background refresh handles nodes without updatedAt gracefully', async () => {
        mockCacheGet.mockReturnValue({
            nodes: [{ id: 'cached-node' }],
            edges: [],
            loadedAt: Date.now() - 60000,
        });
        mockIsOnline.mockReturnValue(true);

        mockLoadNodes.mockResolvedValue([{ id: 'fresh-node' }]);
        mockLoadEdges.mockResolvedValue([]);

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const { unmount } = renderHook(() => useWorkspaceLoader('ws-bg-safe'));

        await waitFor(() => {
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-bg-safe');
            expect(consoleSpy).not.toHaveBeenCalled();
        });
        await waitFor(() => expect(mockLoadKBEntries).toHaveBeenCalled());

        unmount();
        await new Promise((r) => setTimeout(r, 250));
        consoleSpy.mockRestore();
    });

    it('structural guards: uses mergeNodes, no toast/conflict, merge callback', () => {
        const src = readFileSync(
            resolve(__dirname, '../hooks/useWorkspaceLoader.ts'), 'utf-8'
        );
        expect(src).not.toContain('toastStore');
        expect(src).not.toContain('conflictDetector');
        expect(src).not.toContain('detectConflict');
        expect(src).toContain("from '../services/mergeNodes'");

        const bgStart = src.indexOf('async function backgroundRefresh');
        const bgEnd = src.indexOf('\n}\n', bgStart) + 3;
        const bgRefreshFn = src.slice(bgStart, bgEnd);
        expect(bgRefreshFn).not.toContain('setNodes');
        expect(bgRefreshFn).toContain('onMerge');
    });

    it('shows error toast when offline and no cache available', async () => {
        mockCacheGet.mockReturnValue(null);
        mockIsOnline.mockReturnValue(false);
        mockLoadNodes.mockRejectedValue(new Error('offline'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const { result, unmount } = renderHook(() => useWorkspaceLoader('ws-none'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeTruthy();
        });
        await waitFor(() => expect(mockLoadKBEntries).toHaveBeenCalled());

        unmount();
        await new Promise((r) => setTimeout(r, 250));
        consoleSpy.mockRestore();
    });
});
