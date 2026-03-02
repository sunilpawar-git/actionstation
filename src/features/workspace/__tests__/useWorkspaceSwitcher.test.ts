/**
 * useWorkspaceSwitcher Hook Tests - TDD: Write tests FIRST
 * Tests for atomic workspace switching with prefetch-then-swap pattern
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWorkspaceSwitcher } from '../hooks/useWorkspaceSwitcher';

// Mock the workspace service
const mockLoadNodes = vi.fn();
const mockLoadEdges = vi.fn();
vi.mock('../services/workspaceService', () => ({
    loadNodes: (...args: unknown[]) => mockLoadNodes(...args),
    loadEdges: (...args: unknown[]) => mockLoadEdges(...args),
}));

const mockQueueSave = vi.fn();
vi.mock('../stores/offlineQueueStore', () => ({
    useOfflineQueueStore: {
        getState: () => ({
            queueSave: mockQueueSave,
        }),
    },
}));

// Mock the workspace cache
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock('../services/workspaceCache', () => ({
    workspaceCache: {
        get: (...args: unknown[]) => mockCacheGet(...args),
        set: (...args: unknown[]) => mockCacheSet(...args),
    },
}));

// Mock auth store - must handle selector pattern: useAuthStore((s) => s.user)
const mockUser = { id: 'user-1', email: 'test@example.com' };
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector?: (s: { user: typeof mockUser }) => unknown) => {
        const state = { user: mockUser };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

// Mock canvas store
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

// Mock Knowledge Bank to prevent loading errors from dynamic imports
vi.mock('@/features/knowledgeBank/services/knowledgeBankService', () => ({
    loadKBEntries: vi.fn().mockResolvedValue([]),
    knowledgeBankService: {
        search: vi.fn(),
    }
}));

vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: {
        getState: vi.fn(() => ({ setEntries: vi.fn() })),
        setState: vi.fn(),
    },
}));

// Mock workspace store
const mockSetCurrentWorkspaceId = vi.fn();
const mockSetSwitching = vi.fn();
let mockCurrentWorkspaceId = 'ws-current';
let mockIsSwitching = false;
const mockSetNodeCount = vi.fn();
vi.mock('../stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(
        (selector: (state: Record<string, unknown>) => unknown) => {
            const state = {
                currentWorkspaceId: mockCurrentWorkspaceId,
                isSwitching: mockIsSwitching,
            };
            return typeof selector === 'function' ? selector(state) : state;
        },
        {
            getState: () => ({
                setNodeCount: mockSetNodeCount,
                setSwitching: mockSetSwitching,
                setCurrentWorkspaceId: mockSetCurrentWorkspaceId,
            }),
        }
    ),
}));

describe('useWorkspaceSwitcher', () => {
    const mockNodes = [{ id: 'node-1', type: 'idea', data: { prompt: 'Test' } }];
    const mockEdges = [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }];

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockCurrentWorkspaceId = 'ws-current';
        mockIsSwitching = false;
        mockLoadNodes.mockResolvedValue(mockNodes);
        mockLoadEdges.mockResolvedValue(mockEdges);
        mockQueueSave.mockResolvedValue(undefined);
        mockGetState.mockReturnValue({ nodes: [], edges: [] });
        mockCacheGet.mockReturnValue(null); // Default: cache miss
    });

    it('returns isSwitching false initially', () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());
        expect(result.current.isSwitching).toBe(false);
    });

    it('returns error as null initially', () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());
        expect(result.current.error).toBeNull();
    });

    it('calls setSwitching(true) during switch', async () => {
        // Delay the load to capture setSwitching calls
        mockLoadNodes.mockImplementation(() => new Promise((resolve) => {
            setTimeout(() => resolve(mockNodes), 50);
        }));

        const { result } = renderHook(() => useWorkspaceSwitcher());

        act(() => {
            void result.current.switchWorkspace('ws-new');
        });

        // Should have called setSwitching(true) at start
        expect(mockSetSwitching).toHaveBeenCalledWith(true);

        await waitFor(() => {
            // Should have called setSwitching(false) at end
            expect(mockSetSwitching).toHaveBeenCalledWith(false);
        });
    });

    it('prefetches new workspace data before updating store', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        // loadNodes and loadEdges should be called with new workspace ID
        expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-new');
        expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-new');
    });

    it('atomically updates nodes and edges (single setState)', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        expect(mockSetState).toHaveBeenCalledWith(
            expect.objectContaining({
                nodes: mockNodes,
                edges: mockEdges,
                selectedNodeIds: expect.any(Set),
            })
        );
    });

    it('updates currentWorkspaceId after data is loaded', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-new');
    });

    it('calls setSwitching(false) after switch completes', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        // Last call should be setSwitching(false)
        expect(mockSetSwitching).toHaveBeenLastCalledWith(false);
    });

    it('handles switch errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        mockLoadNodes.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        expect(result.current.isSwitching).toBe(false);
        expect(result.current.error).toBeTruthy();
        // Should not update workspace ID on error
        expect(mockSetCurrentWorkspaceId).not.toHaveBeenCalled();
        // finally block must always release the lock
        expect(mockSetSwitching).toHaveBeenLastCalledWith(false);

        consoleSpy.mockRestore();
    });

    it('prevents concurrent switches', async () => {
        // Create a delayed promise to simulate slow network
        let resolveFirst: (value: unknown[]) => void;
        mockLoadNodes.mockImplementationOnce(() => new Promise((resolve) => {
            resolveFirst = resolve;
        }));

        const { result } = renderHook(() => useWorkspaceSwitcher());

        // Start first switch
        act(() => {
            void result.current.switchWorkspace('ws-new-1');
        });

        // Try second switch while first is in progress
        await act(async () => {
            await result.current.switchWorkspace('ws-new-2');
        });

        // Resolve first switch
        await act(async () => {
            resolveFirst(mockNodes);
            await new Promise((r) => setTimeout(r, 10));
        });

        // Only the first switch should have been initiated (second was skipped)
        expect(mockLoadNodes).toHaveBeenCalledTimes(1);
    });

    it('does not switch to same workspace', async () => {
        mockCurrentWorkspaceId = 'ws-same';
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-same');
        });

        // Should not call any load functions
        expect(mockLoadNodes).not.toHaveBeenCalled();
        expect(mockLoadEdges).not.toHaveBeenCalled();
        expect(result.current.isSwitching).toBe(false);
    });

});
