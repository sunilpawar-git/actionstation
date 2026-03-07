/**
 * useWorkspaceSwitcher - Cache integration tests
 * Split from useWorkspaceSwitcher.test.ts to stay under the 300-line limit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkspaceSwitcher } from '../hooks/useWorkspaceSwitcher';

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

// Mock auth store - must handle selector pattern: useAuthStore((s) => s.user)
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector?: (s: { user: { id: string; email: string } }) => unknown) => {
        const state = { user: { id: 'user-1', email: 'test@example.com' } };
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
}));

vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: {
        getState: vi.fn(() => ({ setEntries: vi.fn() })),
        setState: vi.fn(),
    },
}));

const mockSetNodeCount = vi.fn();
const mockSetSwitching = vi.fn();
const mockSetCurrentWorkspaceId = vi.fn();
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

describe('useWorkspaceSwitcher cache integration', () => {
    const mockNodes = [{ id: 'node-1', type: 'idea', data: { prompt: 'Test' } }];
    const mockEdges = [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }];

    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue(mockNodes);
        mockLoadEdges.mockResolvedValue(mockEdges);
        mockGetState.mockReturnValue({ nodes: [], edges: [], clearClusterGroups: vi.fn(), setClusterGroups: vi.fn(), pruneDeletedNodes: vi.fn() });
        mockCacheGet.mockReturnValue(null);
    });

    it('reads from cache when available (no Firestore call)', async () => {
        const cachedData = { nodes: mockNodes, edges: mockEdges, loadedAt: Date.now() };
        mockCacheGet.mockReturnValue(cachedData);

        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-cached');
        });

        expect(mockCacheGet).toHaveBeenCalledWith('ws-cached');
        expect(mockLoadNodes).not.toHaveBeenCalled();
        expect(mockLoadEdges).not.toHaveBeenCalled();
        expect(mockSetState).toHaveBeenCalledWith(
            expect.objectContaining({ nodes: mockNodes, edges: mockEdges })
        );
    });

    it('falls back to Firestore on cache miss', async () => {
        mockCacheGet.mockReturnValue(null);

        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        expect(mockCacheGet).toHaveBeenCalledWith('ws-new');
        expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-new');
        expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-new');
    });

    it('populates cache after Firestore load', async () => {
        mockCacheGet.mockReturnValue(null);

        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        expect(mockCacheSet).toHaveBeenCalledWith(
            'ws-new',
            expect.objectContaining({ nodes: mockNodes, edges: mockEdges })
        );
    });
});
