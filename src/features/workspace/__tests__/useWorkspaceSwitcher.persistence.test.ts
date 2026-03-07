/**
 * useWorkspaceSwitcher — Persistence & Cache Tests
 * Tests localStorage persistence and cache-hit behaviour during workspace switches.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkspaceSwitcher } from '../hooks/useWorkspaceSwitcher';
import { LAST_WORKSPACE_KEY } from '../services/lastWorkspaceService';

const mockLoadNodes = vi.fn();
const mockLoadEdges = vi.fn();
vi.mock('../services/workspaceService', () => ({
    loadNodes: (...args: unknown[]) => mockLoadNodes(...args),
    loadEdges: (...args: unknown[]) => mockLoadEdges(...args),
}));

const mockQueueSave = vi.fn();
vi.mock('../stores/offlineQueueStore', () => ({
    useOfflineQueueStore: {
        getState: () => ({ queueSave: mockQueueSave }),
    },
}));

const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock('../services/workspaceCache', () => ({
    workspaceCache: {
        get: (...args: unknown[]) => mockCacheGet(...args),
        set: (...args: unknown[]) => mockCacheSet(...args),
    },
}));

const mockUser = { id: 'user-1', email: 'test@example.com' };
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector?: (s: { user: typeof mockUser }) => unknown) => {
        const state = { user: mockUser };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

const mockGetState = vi.fn();
const mockSetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
            const state = {};
            return typeof selector === 'function' ? selector(state) : state;
        }),
        {
            getState: () => mockGetState(),
            setState: (...args: unknown[]) => mockSetState(...args),
        }
    ),
    EMPTY_SELECTED_IDS: Object.freeze(new Set<string>()),
}));

vi.mock('@/features/knowledgeBank/services/knowledgeBankService', () => ({
    loadKBEntries: vi.fn().mockResolvedValue([]),
    knowledgeBankService: { search: vi.fn() },
}));

vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: {
        getState: vi.fn(() => ({ setEntries: vi.fn() })),
        setState: vi.fn(),
    },
}));

const mockSetCurrentWorkspaceId = vi.fn();
const mockSetSwitching = vi.fn();
const mockSetNodeCount = vi.fn();
vi.mock('../stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(
        (selector: (state: Record<string, unknown>) => unknown) => {
            const state = { currentWorkspaceId: 'ws-current', isSwitching: false };
            return typeof selector === 'function' ? selector(state) : state;
        },
        {
            getState: () => ({
                workspaces: [],
                setNodeCount: mockSetNodeCount,
                setSwitching: mockSetSwitching,
                setCurrentWorkspaceId: mockSetCurrentWorkspaceId,
            }),
        }
    ),
}));

const mockNodes = [{ id: 'node-1', type: 'idea', data: { prompt: 'Test' } }];
const mockEdges = [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }];

describe('useWorkspaceSwitcher — persistence & cache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockLoadNodes.mockResolvedValue(mockNodes);
        mockLoadEdges.mockResolvedValue(mockEdges);
        mockGetState.mockReturnValue({ nodes: [], edges: [], clearClusterGroups: vi.fn(), setClusterGroups: vi.fn(), pruneDeletedNodes: vi.fn() });
        mockCacheGet.mockReturnValue(null);
    });

    it('persists workspace ID to localStorage after successful switch', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => { await result.current.switchWorkspace('ws-new'); });

        expect(localStorage.getItem(LAST_WORKSPACE_KEY)).toBe('ws-new');
    });

    it('does not persist workspace ID to localStorage when switch fails', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        mockLoadNodes.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => { await result.current.switchWorkspace('ws-new'); });

        expect(localStorage.getItem(LAST_WORKSPACE_KEY)).toBeNull();
        consoleSpy.mockRestore();
    });

    it('uses cached data on cache hit and skips network calls', async () => {
        const cachedNodes = [{ id: 'cached-node', type: 'idea', data: { prompt: 'Cached' } }];
        const cachedEdges = [{ id: 'cached-edge', sourceNodeId: 'cached-node', targetNodeId: 'n-2' }];
        mockCacheGet.mockReturnValue({ nodes: cachedNodes, edges: cachedEdges, loadedAt: Date.now() });

        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => { await result.current.switchWorkspace('ws-new'); });

        expect(mockLoadNodes).not.toHaveBeenCalled();
        expect(mockLoadEdges).not.toHaveBeenCalled();
        expect(mockSetState).toHaveBeenCalledWith(
            expect.objectContaining({ nodes: cachedNodes, edges: cachedEdges })
        );
    });

    it('saves current workspace before switching when data exists', async () => {
        mockGetState.mockReturnValue({ nodes: mockNodes, edges: mockEdges, clearClusterGroups: vi.fn(), setClusterGroups: vi.fn(), pruneDeletedNodes: vi.fn() });

        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => { await result.current.switchWorkspace('ws-new'); });

        expect(mockQueueSave).toHaveBeenCalledWith('user-1', 'ws-current', mockNodes, mockEdges);
    });
});
