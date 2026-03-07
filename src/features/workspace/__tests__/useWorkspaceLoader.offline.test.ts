/**
 * useWorkspaceLoader hasOfflineData Tests
 * TDD: Verifies the hasOfflineData extension for PWA offline support
 *
 * Core loading behavior (cache-miss, error handling) is tested
 * extensively in useWorkspaceLoader.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useWorkspaceLoader } from '../hooks/useWorkspaceLoader';

// Exact same mock pattern as useWorkspaceLoader.test.ts
const mockLoadNodes = vi.fn();
const mockLoadEdges = vi.fn();
vi.mock('../services/workspaceService', () => ({
    loadNodes: (...args: unknown[]) => mockLoadNodes(...args),
    loadEdges: (...args: unknown[]) => mockLoadEdges(...args),
}));

const mockCacheGet = vi.fn();
vi.mock('../services/workspaceCache', () => ({
    workspaceCache: {
        get: (...args: unknown[]) => mockCacheGet(...args),
        set: vi.fn(),
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

// Mock auth store - must handle selector pattern: useAuthStore((s) => s.user)
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector?: (s: { user: { id: string; email: string } }) => unknown) => {
        const state = { user: { id: 'user-1', email: 'test@test.com' } };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

// Avoid real KB service async side effects during loader tests.
const mockSetKBEntries = vi.fn();
vi.mock('@/features/knowledgeBank/services/knowledgeBankService', () => ({
    loadKBEntries: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: {
        getState: () => ({ setEntries: mockSetKBEntries }),
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

describe('useWorkspaceLoader - hasOfflineData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockLoadEdges.mockResolvedValue([]);
    });

    afterEach(() => {
        cleanup();
    });

    it('returns hasOfflineData=true when workspace is cached', async () => {
        mockCacheGet.mockReturnValue({
            nodes: [{ id: 'n1' }],
            edges: [],
            loadedAt: Date.now(),
        });

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const { result, unmount } = renderHook(() => useWorkspaceLoader('ws-cached'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.hasOfflineData).toBe(true);

        // Background refresh must not silently crash (regression for getState mock)
        await waitFor(() => {
            expect(mockLoadNodes).toHaveBeenCalled();
        });
        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
        unmount();
        await new Promise((r) => setTimeout(r, 250));
    });

    it('includes hasOfflineData in the return type', async () => {
        mockCacheGet.mockReturnValue({
            nodes: [],
            edges: [],
            loadedAt: Date.now(),
        });

        const { result, unmount } = renderHook(() => useWorkspaceLoader('ws-type'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current).toHaveProperty('hasOfflineData');
        expect(typeof result.current.hasOfflineData).toBe('boolean');
        unmount();
        await new Promise((r) => setTimeout(r, 250));
    });
});
