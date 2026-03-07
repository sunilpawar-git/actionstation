/**
 * Offline Pin End-to-End Tests
 * TDD: Full integration test for offline workspace pinning flow
 *
 * Tests the complete user journey:
 * 1. User pins workspace (Pro tier)
 * 2. Workspace data cached to IndexedDB
 * 3. User goes offline
 * 4. Pinned workspace loads from cache
 * 5. Unpinned workspaces fail to load
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePinnedWorkspaceStore } from '../stores/pinnedWorkspaceStore';
import { useWorkspaceLoader } from '../hooks/useWorkspaceLoader';
import type { Node, Edge } from '@xyflow/react';

// Mock Firebase
const mockLoadNodes = vi.fn();
const mockLoadEdges = vi.fn();
vi.mock('../services/workspaceService', () => ({
    loadNodes: (...args: unknown[]) => mockLoadNodes(...args),
    loadEdges: (...args: unknown[]) => mockLoadEdges(...args),
}));

// Mock IndexedDB cache
const mockIdbSet = vi.fn().mockResolvedValue(undefined);
const mockIdbGet = vi.fn().mockResolvedValue(null);
const mockIdbRemove = vi.fn().mockResolvedValue(undefined);
const mockGetPinnedIds = vi.fn().mockResolvedValue([]);
const mockPin = vi.fn().mockResolvedValue(true);
const mockUnpin = vi.fn().mockResolvedValue(true);

vi.mock('../services/idbCacheService', () => ({
    idbCacheService: {
        setWorkspaceData: (...args: unknown[]) => mockIdbSet(...args),
        getWorkspaceData: (...args: unknown[]) => mockIdbGet(...args),
        removeWorkspaceData: (...args: unknown[]) => mockIdbRemove(...args),
        clear: vi.fn(),
        getLruOrder: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('../services/workspacePinService', () => ({
    workspacePinService: {
        getPinnedIds: () => mockGetPinnedIds(),
        pin: (...args: unknown[]) => mockPin(...args),
        unpin: (...args: unknown[]) => mockUnpin(...args),
        isPinned: vi.fn(),
        clear: vi.fn(),
    },
}));

// Mock workspaceCache (in-memory cache)
const mockCacheGet = vi.fn().mockReturnValue(null);
const mockCacheSet = vi.fn();
vi.mock('../services/workspaceCache', () => ({
    workspaceCache: {
        get: (...args: unknown[]) => mockCacheGet(...args),
        set: (...args: unknown[]) => mockCacheSet(...args),
    },
}));

// Mock network status (simulate offline)
const mockIsOnline = vi.fn().mockReturnValue(true);
vi.mock('@/shared/stores/networkStatusStore', () => ({
    useNetworkStatusStore: Object.assign(
        vi.fn(() => ({ isOnline: mockIsOnline() })),
        { getState: () => ({ isOnline: mockIsOnline() }) }
    ),
}));

// Mock auth store - must handle selector pattern: useAuthStore((s) => s.user)
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector?: (s: { user: { id: string; email: string } }) => unknown) => {
        const state = { user: { id: 'user-1', email: 'test@test.com' } };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

const mockSetNodes = vi.fn();
const mockSetEdges = vi.fn();
const mockCanvasStoreState = {
    nodes: [], edges: [],
    viewport: { x: 32, y: 32, zoom: 1 },
    editingNodeId: null,
    setNodes: mockSetNodes,
    setEdges: mockSetEdges,
    clearClusterGroups: vi.fn(),
    setClusterGroups: vi.fn(),
    pruneDeletedNodes: vi.fn(),
};
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        (selector?: (s: typeof mockCanvasStoreState) => unknown) =>
            typeof selector === 'function' ? selector(mockCanvasStoreState) : mockCanvasStoreState,
        {
            getState: () => mockCanvasStoreState,
            setState: vi.fn(),
        }
    ),
    EMPTY_SELECTED_IDS: Object.freeze(new Set<string>()),
}));

vi.mock('../stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(vi.fn(), {
        getState: () => ({ workspaces: [] }),
    }),
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

describe('Offline Pin - E2E Integration', () => {
    const testNodes: Node[] = [
        { id: 'n1', type: 'prompt', position: { x: 0, y: 0 }, data: { prompt: 'Test' } },
        { id: 'n2', type: 'ai', position: { x: 100, y: 100 }, data: { output: 'Result' } },
    ];
    const testEdges: Edge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        usePinnedWorkspaceStore.setState({ pinnedIds: [], isLoading: false });
        mockIsOnline.mockReturnValue(true); // Start online
        mockCacheGet.mockReturnValue(null); // Reset cache to empty
        mockIdbSet.mockResolvedValue(undefined); // Reset IDB to succeed
    });

    it.skip('FULL FLOW: Pin → Cache → Offline → Load from cache', async () => {
        // SKIP REASON: Firebase SDK initialises a real gRPC connection during dynamic import of
        // knowledgeBankService inside useWorkspaceLoader, even when the service itself is mocked.
        // Requires Firebase Emulator or full module isolation to run correctly.
        // Track: set up Firebase Emulator in CI before enabling this test.
        // STEP 1: User is online, loads workspace from Firestore
        mockLoadNodes.mockResolvedValue(testNodes);
        mockLoadEdges.mockResolvedValue(testEdges);

        const { result: loader } = renderHook(() => useWorkspaceLoader('ws-test'));
        await waitFor(() => expect(loader.current.isLoading).toBe(false), { timeout: 3000 });

        expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-test');
        expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-test');
        expect(mockCacheSet).toHaveBeenCalled(); // Loader cached data

        // STEP 2: User pins the workspace (Pro tier)
        // Workspace is now in cache (from STEP 1), so pin can persist it to IDB
        mockCacheGet.mockReturnValue({
            nodes: testNodes,
            edges: testEdges,
            loadedAt: Date.now(),
        });

        mockGetPinnedIds.mockResolvedValue(['ws-test']);
        await act(async () => {
            await usePinnedWorkspaceStore.getState().pinWorkspace('ws-test');
        });

        expect(mockPin).toHaveBeenCalledWith('ws-test');
        expect(usePinnedWorkspaceStore.getState().isPinned('ws-test')).toBe(true);

        // Verify data was cached to IndexedDB
        expect(mockIdbSet).toHaveBeenCalledWith('ws-test', expect.objectContaining({
            nodes: testNodes,
            edges: testEdges,
        }));

        // STEP 3: User goes OFFLINE
        mockIsOnline.mockReturnValue(false);
        mockLoadNodes.mockRejectedValue(new Error('Network error'));
        mockLoadEdges.mockRejectedValue(new Error('Network error'));

        // STEP 4: Simulate cache returning pinned data
        mockIdbGet.mockResolvedValue({
            nodes: testNodes,
            edges: testEdges,
            loadedAt: Date.now(),
        });

        // STEP 5: Load workspace while offline
        const { result: offlineLoader } = renderHook(() => useWorkspaceLoader('ws-test'));
        await waitFor(() => expect(offlineLoader.current.isLoading).toBe(false));

        // EXPECTED: Workspace loads from cache, not Firestore
        expect(offlineLoader.current.hasOfflineData).toBe(true);
        expect(mockSetNodes).toHaveBeenCalledWith(testNodes);
        expect(mockSetEdges).toHaveBeenCalledWith(testEdges);
    });

    it('FAIL CASE: Unpinned workspace fails when offline', async () => {
        // User is offline, workspace is NOT pinned
        mockIsOnline.mockReturnValue(false);
        mockIdbGet.mockResolvedValue(null); // No cache
        mockLoadNodes.mockRejectedValue(new Error('Network error'));
        mockLoadEdges.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useWorkspaceLoader('ws-unpinned'));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // EXPECTED: Fails fast without calling Firestore
        expect(result.current.hasOfflineData).toBe(false);
        expect(result.current.error).toBeTruthy(); // Shows offline error
        expect(mockSetNodes).not.toHaveBeenCalled();
        expect(mockLoadNodes).not.toHaveBeenCalled(); // No Firestore call
    });

    it('UNPIN removes data from cache', async () => {
        usePinnedWorkspaceStore.setState({ pinnedIds: ['ws-test'] });

        await act(async () => {
            await usePinnedWorkspaceStore.getState().unpinWorkspace('ws-test');
        });

        expect(mockUnpin).toHaveBeenCalledWith('ws-test');
        expect(mockIdbRemove).toHaveBeenCalledWith('ws-test');
        expect(usePinnedWorkspaceStore.getState().isPinned('ws-test')).toBe(false);
    });

    it.skip('CACHE HIT: Loads from cache first, then validates with Firestore', async () => {
        // SKIP REASON: Same Firebase gRPC bleed-through as 'FULL FLOW' test above.
        // Track: set up Firebase Emulator in CI before enabling this test.
        // Workspace is pinned and cached
        mockIdbGet.mockResolvedValue({
            nodes: testNodes,
            edges: testEdges,
            loadedAt: Date.now() - 5000, // 5 seconds old
        });
        mockLoadNodes.mockResolvedValue(testNodes);
        mockLoadEdges.mockResolvedValue(testEdges);
        mockIsOnline.mockReturnValue(true);

        const { result } = renderHook(() => useWorkspaceLoader('ws-cached'));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // EXPECTED: Loads from cache immediately, then validates
        expect(result.current.hasOfflineData).toBe(true);
        expect(mockSetNodes).toHaveBeenCalledWith(testNodes);
    });

    it('STORAGE QUOTA: Prevents pin when IndexedDB is full', async () => {
        // Workspace must be in workspaceCache (in-memory) to trigger IDB write
        mockCacheGet.mockReturnValue({
            nodes: testNodes,
            edges: testEdges,
            loadedAt: Date.now(),
        });

        // IndexedDB write fails with quota error
        mockIdbSet.mockRejectedValue(new Error('QuotaExceededError: Storage quota exceeded'));

        let thrownError: Error | undefined;
        try {
            await act(async () => {
                await usePinnedWorkspaceStore.getState().pinWorkspace('ws-huge');
            });
        } catch (e) {
            thrownError = e as Error;
        }

        expect(thrownError?.message).toContain('Storage quota exceeded');

        // Should rollback: not added to pinned list if cache fails
        expect(usePinnedWorkspaceStore.getState().isPinned('ws-huge')).toBe(false);
        expect(mockUnpin).toHaveBeenCalledWith('ws-huge'); // Rollback called
    });
});
