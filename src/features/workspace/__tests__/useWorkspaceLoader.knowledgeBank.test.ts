/**
 * useWorkspaceLoader Hook Tests - Knowledge Bank loading (regression)
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
const mockUser = { id: 'user-1', email: 'test@example.com' };
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector?: (s: { user: typeof mockUser }) => unknown) => {
        const state = { user: mockUser };
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

describe('useWorkspaceLoader Knowledge Bank loading', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockLoadEdges.mockResolvedValue([]);
        mockCacheGet.mockReturnValue(null);
        mockIsOnline.mockReturnValue(true);
    });

    it('loads KB entries on initial workspace load', async () => {
        const mockKBEntries = [
            { id: 'kb-1', title: 'Note', content: 'Hello', type: 'text', enabled: true },
        ];
        mockLoadKBEntries.mockResolvedValue(mockKBEntries);

        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        await waitFor(() => {
            expect(mockLoadKBEntries).toHaveBeenCalledWith('user-1', 'ws-1');
            expect(mockSetKBEntries).toHaveBeenCalledWith(mockKBEntries);
        });
    });

    it('does not block workspace load when KB load fails', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockLoadKBEntries.mockRejectedValue(new Error('KB permission denied'));

        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        consoleSpy.mockRestore();
    });
});
