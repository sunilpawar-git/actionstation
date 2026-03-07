/**
 * useWorkspaceLoader - Background refresh merge integration tests
 * Validates two-layer edit protection: editingNodeId guard + timestamp merge.
 */
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

vi.mock('@/features/knowledgeBank/services/knowledgeBankService', () => ({
    loadKBEntries: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: Object.assign(vi.fn(), {
        getState: () => ({ setEntries: vi.fn() }),
    }),
}));

// Mock auth store - must handle selector pattern: useAuthStore((s) => s.user)
const mockUser = { id: 'user-1', email: 'test@example.com' };
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector?: (s: { user: typeof mockUser }) => unknown) => {
        const state = { user: mockUser };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

const mockCanvasSetState = vi.fn();
let mockStoreNodes: unknown[] = [];
let mockStoreEdges: unknown[] = [];
let mockEditingNodeId: string | null = null;
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn(() => ({})),
        {
            getState: () => ({ nodes: mockStoreNodes, edges: mockStoreEdges, editingNodeId: mockEditingNodeId, clearClusterGroups: vi.fn(), setClusterGroups: vi.fn(), pruneDeletedNodes: vi.fn() }),
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

describe('useWorkspaceLoader – background refresh merge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockLoadEdges.mockResolvedValue([]);
        mockCacheGet.mockReturnValue(null);
        mockIsOnline.mockReturnValue(true);
        mockStoreNodes = [];
        mockStoreEdges = [];
        mockEditingNodeId = null;
    });

    it('preserves the node being edited during background refresh (Layer 1)', async () => {
        const localNode = {
            id: 'editing-node', type: 'idea',
            data: { output: 'my draft' },
            updatedAt: new Date('2025-01-01'), createdAt: new Date('2025-01-01'),
        };
        mockStoreNodes = [localNode];
        mockEditingNodeId = 'editing-node';

        mockCacheGet.mockReturnValue({
            nodes: [localNode], edges: [], loadedAt: Date.now() - 60000,
        });

        const freshNode = {
            id: 'editing-node', type: 'idea',
            data: { output: 'stale server data' },
            updatedAt: new Date('2025-06-01'), createdAt: new Date('2025-01-01'),
        };
        mockLoadNodes.mockResolvedValue([freshNode]);
        mockLoadEdges.mockResolvedValue([]);

        renderHook(() => useWorkspaceLoader('ws-merge'));

        await waitFor(() => {
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-merge');
        });

        await waitFor(() => {
            const bgRefreshCall = mockCanvasSetState.mock.calls.find(
                (call: unknown[]) => {
                    const arg = call[0] as Record<string, unknown>;
                    return arg.nodes !== mockCacheGet.mock.results[0]?.value?.nodes;
                }
            );
            if (bgRefreshCall) {
                const arg = bgRefreshCall[0] as { nodes: Array<{ id: string; data: { output: string } }> };
                const editedNode = arg.nodes.find((n) => n.id === 'editing-node');
                expect(editedNode?.data.output).toBe('my draft');
            }
        });
    });

    it('accepts newer remote data for non-editing nodes (Layer 2)', async () => {
        const staleLocal = {
            id: 'stale-node', type: 'idea',
            data: { output: 'old content' },
            updatedAt: new Date('2025-01-01'), createdAt: new Date('2025-01-01'),
        };
        mockStoreNodes = [staleLocal];
        mockEditingNodeId = null;

        mockCacheGet.mockReturnValue({
            nodes: [staleLocal], edges: [], loadedAt: Date.now() - 60000,
        });

        const freshRemote = {
            id: 'stale-node', type: 'idea',
            data: { output: 'updated from server' },
            updatedAt: new Date('2025-06-01'), createdAt: new Date('2025-01-01'),
        };
        mockLoadNodes.mockResolvedValue([freshRemote]);
        mockLoadEdges.mockResolvedValue([]);

        renderHook(() => useWorkspaceLoader('ws-merge-accept'));

        await waitFor(() => {
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-merge-accept');
        });

        await waitFor(() => {
            const bgCalls = mockCanvasSetState.mock.calls;
            const lastCall = bgCalls[bgCalls.length - 1] as unknown[];
            const arg = lastCall[0] as { nodes: Array<{ id: string; data: { output: string } }> };
            const updated = arg.nodes.find((n) => n.id === 'stale-node');
            expect(updated?.data.output).toBe('updated from server');
        });
    });

    it('caches the merged result after background refresh', async () => {
        const localNode = {
            id: 'kept-local', type: 'idea',
            data: { output: 'local wins' },
            updatedAt: new Date('2025-06-01'), createdAt: new Date('2025-01-01'),
        };
        mockStoreNodes = [localNode];
        mockEditingNodeId = null;

        mockCacheGet.mockReturnValue({
            nodes: [localNode], edges: [], loadedAt: Date.now() - 60000,
        });

        const remoteNode = {
            id: 'kept-local', type: 'idea',
            data: { output: 'remote stale' },
            updatedAt: new Date('2025-01-01'), createdAt: new Date('2025-01-01'),
        };
        mockLoadNodes.mockResolvedValue([remoteNode]);
        mockLoadEdges.mockResolvedValue([]);

        renderHook(() => useWorkspaceLoader('ws-cache-verify'));

        await waitFor(() => {
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-cache-verify');
        });

        await waitFor(() => {
            const cacheCalls = mockCacheSet.mock.calls.filter(
                (call: unknown[]) => call[0] === 'ws-cache-verify'
            );
            expect(cacheCalls.length).toBeGreaterThanOrEqual(1);
            const lastCacheWrite = cacheCalls[cacheCalls.length - 1] as [string, { nodes: Array<{ id: string; data: { output: string } }> }];
            const cachedNode = lastCacheWrite[1].nodes.find((n) => n.id === 'kept-local');
            expect(cachedNode?.data.output).toBe('local wins');
        });
    });

    it('retains local-only nodes not yet synced to remote', async () => {
        const localOnly = {
            id: 'new-unsaved', type: 'idea',
            data: { output: 'brand new' },
            updatedAt: new Date(), createdAt: new Date(),
        };
        const shared = {
            id: 'shared', type: 'idea',
            data: { output: 'content' },
            updatedAt: new Date('2025-06-01'), createdAt: new Date('2025-01-01'),
        };
        mockStoreNodes = [localOnly, shared];
        mockEditingNodeId = null;

        mockCacheGet.mockReturnValue({
            nodes: [localOnly, shared], edges: [], loadedAt: Date.now() - 60000,
        });

        mockLoadNodes.mockResolvedValue([shared]);
        mockLoadEdges.mockResolvedValue([]);

        renderHook(() => useWorkspaceLoader('ws-merge-retain'));

        await waitFor(() => {
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-merge-retain');
        });

        await waitFor(() => {
            const bgCalls = mockCanvasSetState.mock.calls;
            const lastCall = bgCalls[bgCalls.length - 1] as unknown[];
            const arg = lastCall[0] as { nodes: Array<{ id: string }> };
            expect(arg.nodes.find((n) => n.id === 'new-unsaved')).toBeDefined();
            expect(arg.nodes.find((n) => n.id === 'shared')).toBeDefined();
        });
    });

    it('retains local-only edges not yet synced to remote', async () => {
        const node = {
            id: 'n1', type: 'idea',
            data: { output: 'content' },
            updatedAt: new Date('2025-06-01'), createdAt: new Date('2025-01-01'),
        };
        const localEdge = {
            id: 'local-edge', workspaceId: 'ws-edge',
            sourceNodeId: 'n1', targetNodeId: 'n2', relationshipType: 'related' as const,
        };
        const remoteEdge = {
            id: 'remote-edge', workspaceId: 'ws-edge',
            sourceNodeId: 'n1', targetNodeId: 'n3', relationshipType: 'related' as const,
        };

        mockStoreNodes = [node];
        mockStoreEdges = [localEdge, remoteEdge];
        mockEditingNodeId = null;

        mockCacheGet.mockReturnValue({
            nodes: [node], edges: [localEdge, remoteEdge], loadedAt: Date.now() - 60000,
        });

        mockLoadNodes.mockResolvedValue([node]);
        mockLoadEdges.mockResolvedValue([remoteEdge]);

        renderHook(() => useWorkspaceLoader('ws-edge'));

        await waitFor(() => {
            expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-edge');
        });

        await waitFor(() => {
            const bgCalls = mockCanvasSetState.mock.calls;
            const lastCall = bgCalls[bgCalls.length - 1] as unknown[];
            const arg = lastCall[0] as { edges: Array<{ id: string }> };
            expect(arg.edges.find((e) => e.id === 'local-edge')).toBeDefined();
            expect(arg.edges.find((e) => e.id === 'remote-edge')).toBeDefined();
        });
    });
});
